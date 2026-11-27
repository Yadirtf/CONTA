import { asc, count, desc, eq, gte, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type {
  EnvioDeLaVenta,
  FacturaDeLaVenta,
  RepositorioDeVentas,
  ResumenDeVenta,
  VentaGuardada,
} from '../../../aplicacion/puertos/repositorio-de-ventas.js';
import { ESTADOS_DEL_ENVIO, type EstadoDelEnvio, type Venta } from '../../../dominio/index.js';
import { numeracionEnConflicto } from '../../../aplicacion/ventas/errores-de-venta.js';
import { codigoQrDelXml } from '../../dian-directa/ubl/codigo-qr-del-xml.js';
import { emisorDelXml } from '../../dian-directa/ubl/emisor-del-xml.js';
import { RepositorioDeEnviosPostgres } from '../repositorio-de-envios-postgres.js';
import { enviosDian } from '../tablas-envio-dian.js';
import { emisionesDeVenta, lineasDeVenta, ventas } from './tablas-ventas.js';
import { filasDeVenta, ventaDeFilas } from './venta-de-filas.js';

// Corre en la transacción de una empresa: RLS solo deja ver y escribir sus ventas, así que no filtra por empresa
// a mano. empresa_id se llena con conta_sistema.empresa_actual(): no se puede escribir en otra empresa.
const EMPRESA = sql`conta_sistema.empresa_actual()`;

export class RepositorioDeVentasPostgres implements RepositorioDeVentas {
  constructor(private readonly ejecutor: Ejecutor) {}

  async conId(id: string): Promise<VentaGuardada | null> {
    const [fila] = await this.ejecutor.select().from(ventas).where(eq(ventas.id, id)).limit(1);
    if (!fila) return null;
    const lineas = await this.ejecutor.select().from(lineasDeVenta).where(eq(lineasDeVenta.ventaId, id)).orderBy(asc(lineasDeVenta.orden));
    return { venta: ventaDeFilas(fila, lineas), resolucionId: fila.resolucionId };
  }

  async huellaDe(id: string): Promise<string | null> {
    const [fila] = await this.ejecutor.select({ huella: ventas.huella }).from(ventas).where(eq(ventas.id, id)).limit(1);
    return fila?.huella ?? null;
  }

  async guardar(venta: Venta, resolucionId: string): Promise<boolean> {
    const filas = filasDeVenta(venta, resolucionId);
    const insertadas = await this.ejecutor
      .insert(ventas)
      .values({ ...filas.venta, empresaId: EMPRESA })
      .onConflictDoNothing({ target: [ventas.empresaId, ventas.id] })
      .returning({ id: ventas.id })
      .catch((error: unknown) => {
        // El número reservado ya es de otra venta (una resolución mal cargada): 409 con palabras, no un 500.
        if (restriccionDe(error) === NUMERO_UNICO) throw numeracionEnConflicto();
        throw error;
      });
    if (insertadas.length === 0) return false;
    await this.ejecutor.insert(lineasDeVenta).values(filas.lineas.map((l) => ({ ...l, empresaId: EMPRESA })));
    return true;
  }

  async contarDesde(fecha: Date): Promise<number> {
    const [fila] = await this.ejecutor.select({ cuantas: count() }).from(ventas).where(gte(ventas.emitidaEn, fecha));
    return fila?.cuantas ?? 0;
  }

  async consumirCupoDePersona(usuarioId: string, maximo: number): Promise<boolean> {
    // Un solo UPSERT atómico, como el de productos: dos ventas a la vez no pasan el cupo. El día es el de Colombia.
    const { rows } = await this.ejecutor.execute(sql`
      insert into conta_sistema.cupos_diarios as c (usuario_id, recurso, dia, usados)
      values (${usuarioId}, 'ventas', (now() at time zone 'America/Bogota')::date, 1)
      on conflict (usuario_id, recurso, dia) do update set usados = c.usados + 1 where c.usados < ${maximo}
      returning c.usados`);
    return rows.length === 1;
  }

  async registrarEmision(ventaId: string, envioId: string): Promise<void> {
    await this.ejecutor.insert(emisionesDeVenta).values({ empresaId: EMPRESA, ventaId, envioId }).onConflictDoNothing();
  }

  async envioDe(ventaId: string): Promise<EnvioDeLaVenta | null> {
    const [fila] = await this.ejecutor
      .select({ envioId: emisionesDeVenta.envioId })
      .from(emisionesDeVenta)
      .where(eq(emisionesDeVenta.ventaId, ventaId))
      .limit(1);
    if (!fila) return null;
    const envio = await new RepositorioDeEnviosPostgres(this.ejecutor).buscar(fila.envioId);
    if (!envio) throw new Error(`La venta ${ventaId} apunta a un envío que no existe`);
    const { estado, respuesta } = envio.instantanea();
    return { envioId: fila.envioId, estado, respuesta };
  }

  async facturaDe(ventaId: string): Promise<FacturaDeLaVenta | null> {
    const [fila] = await this.ejecutor
      .select({ estado: enviosDian.estado, cufe: enviosDian.cufe, xmlFirmado: enviosDian.xmlFirmado })
      .from(emisionesDeVenta)
      .innerJoin(enviosDian, eq(enviosDian.id, emisionesDeVenta.envioId))
      .where(eq(emisionesDeVenta.ventaId, ventaId))
      .limit(1);
    if (!fila) return null;
    const { xmlFirmado } = fila;
    return { estado: estadoDelEnvioValido(fila.estado), cufe: fila.cufe, codigoQr: codigoQrDelXml(xmlFirmado), emisor: emisorDelXml(xmlFirmado), xmlFirmado };
  }

  async deEnvio(envioId: string): Promise<VentaGuardada | null> {
    const [fila] = await this.ejecutor
      .select({ ventaId: emisionesDeVenta.ventaId })
      .from(emisionesDeVenta)
      .where(eq(emisionesDeVenta.envioId, envioId))
      .limit(1);
    return fila ? this.conId(fila.ventaId) : null;
  }

  async recientes(limite: number): Promise<ResumenDeVenta[]> {
    const filas = await this.ejecutor
      .select({
        id: ventas.id,
        prefijo: ventas.prefijo,
        consecutivo: ventas.consecutivo,
        emitidaEn: ventas.emitidaEn,
        comprador: sql<string>`${ventas.comprador} ->> 'razonSocial'`,
        total: ventas.total,
        estado: enviosDian.estado,
      })
      .from(ventas)
      .leftJoin(emisionesDeVenta, eq(emisionesDeVenta.ventaId, ventas.id))
      .leftJoin(enviosDian, eq(enviosDian.id, emisionesDeVenta.envioId))
      .orderBy(desc(ventas.emitidaEn), desc(ventas.consecutivo))
      .limit(limite);
    return filas.map((f) => ({
      id: f.id,
      numero: `${f.prefijo}${f.consecutivo}`,
      emitidaEn: f.emitidaEn,
      comprador: f.comprador,
      total: f.total,
      estadoDelEnvio: f.estado === null ? null : estadoDelEnvioValido(f.estado),
    }));
  }
}

function estadoDelEnvioValido(estado: string): EstadoDelEnvio {
  if (!(ESTADOS_DEL_ENVIO as readonly string[]).includes(estado)) throw new Error(`Estado de envío desconocido: ${estado}`);
  return estado as EstadoDelEnvio;
}

const NUMERO_UNICO = 'ventas_empresa_id_prefijo_consecutivo_key';

function restriccionDe(error: unknown): string | undefined {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    if ('constraint' in e && typeof e.constraint === 'string') return e.constraint;
  }
  return undefined;
}
