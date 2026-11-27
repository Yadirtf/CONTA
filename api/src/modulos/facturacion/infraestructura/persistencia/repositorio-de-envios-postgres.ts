import { and, eq, max, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { DocumentoDelEnvio, RepositorioDeEnvios } from '../../aplicacion/puertos/repositorio-de-envios.js';
import { EnvioDian, ESTADOS_DEL_ENVIO, RespuestaDeLaDian, type EstadoDelEnvio } from '../../dominio/index.js';
import { enviosDian } from './tablas-envio-dian.js';

// Sin filtro por empresa a mano: la transacción ya la fijó y RLS la impone (ADR-0006).
// empresa_id se llena con conta_sistema.empresa_actual(): el repositorio no puede escribir en otra empresa.

const COLUMNAS_DEL_ESTADO = {
  id: enviosDian.id,
  cufe: enviosDian.cufe,
  numero: enviosDian.numero,
  estado: enviosDian.estado,
  zipKey: enviosDian.zipKey,
  intentos: enviosDian.intentos,
  fallasSeguidas: enviosDian.fallasSeguidas,
  consultas: enviosDian.consultas,
  proximoIntentoEn: enviosDian.proximoIntentoEn,
  respuestaValida: enviosDian.respuestaValida,
  respuestaCodigo: enviosDian.respuestaCodigo,
  respuestaDescripcion: enviosDian.respuestaDescripcion,
  respuestaMensajes: enviosDian.respuestaMensajes,
};

type FilaDelEstado = Pick<typeof enviosDian.$inferSelect, keyof typeof COLUMNAS_DEL_ESTADO>;

export class RepositorioDeEnviosPostgres implements RepositorioDeEnvios {
  constructor(private readonly ejecutor: Ejecutor) {}

  buscar(id: string): Promise<EnvioDian | null> {
    return this.unoDonde(eq(enviosDian.id, id));
  }

  buscarPorCufe(cufe: string): Promise<EnvioDian | null> {
    return this.unoDonde(eq(enviosDian.cufe, cufe));
  }

  async documentoDe(id: string): Promise<DocumentoDelEnvio | null> {
    const [fila] = await this.ejecutor
      .select({
        xmlFirmado: enviosDian.xmlFirmado,
        nitEmisor: enviosDian.nitEmisor,
        anio: enviosDian.anio,
        consecutivo: enviosDian.consecutivo,
      })
      .from(enviosDian)
      .where(eq(enviosDian.id, id))
      .limit(1);
    return fila ?? null;
  }

  async siguienteConsecutivo(anio: number): Promise<number> {
    // Un candado de la transacción por empresa y año: dos envíos a la vez no toman el mismo número de archivo
    // (hallazgo H1 de la prueba de ataque de HU-06.01). Se suelta al confirmar o deshacer.
    await this.ejecutor.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext('envios_dian:' || conta_sistema.empresa_actual()::text || ':' || ${anio}::text))`,
    );
    const [fila] = await this.ejecutor.select({ ultimo: max(enviosDian.consecutivo) }).from(enviosDian).where(eq(enviosDian.anio, anio));
    return (fila?.ultimo ?? 0) + 1;
  }

  async crear(envio: EnvioDian, documento: DocumentoDelEnvio): Promise<void> {
    await this.ejecutor.insert(enviosDian).values({
      empresaId: sql`conta_sistema.empresa_actual()`,
      ...documento,
      ...columnasDelEstado(envio),
      id: envio.id,
      cufe: envio.cufe,
      numero: envio.instantanea().numero,
    });
  }

  async actualizar(envio: EnvioDian, intentosLeidos: number): Promise<boolean> {
    const filas = await this.ejecutor
      .update(enviosDian)
      .set({ ...columnasDelEstado(envio), actualizadoEn: sql`now()` })
      .where(and(eq(enviosDian.id, envio.id), eq(enviosDian.intentos, intentosLeidos)))
      .returning({ id: enviosDian.id });
    return filas.length === 1;
  }

  private async unoDonde(condicion: ReturnType<typeof eq>): Promise<EnvioDian | null> {
    const [fila] = await this.ejecutor.select(COLUMNAS_DEL_ESTADO).from(enviosDian).where(condicion).limit(1);
    return fila ? aEnvio(fila) : null;
  }
}

function columnasDelEstado(envio: EnvioDian) {
  const d = envio.instantanea();
  return {
    estado: d.estado,
    zipKey: d.zipKey,
    intentos: d.intentos,
    fallasSeguidas: d.fallasSeguidas,
    consultas: d.consultas,
    proximoIntentoEn: d.proximoIntentoEn,
    respuestaValida: d.respuesta?.valida ?? null,
    respuestaCodigo: d.respuesta?.codigo ?? null,
    respuestaDescripcion: d.respuesta?.descripcion ?? null,
    respuestaMensajes: [...(d.respuesta?.mensajes ?? [])],
  };
}

function aEnvio(f: FilaDelEstado): EnvioDian {
  return EnvioDian.reconstituir({
    id: f.id,
    cufe: f.cufe,
    numero: f.numero,
    estado: estadoValido(f.estado),
    zipKey: f.zipKey,
    intentos: f.intentos,
    fallasSeguidas: f.fallasSeguidas,
    consultas: f.consultas,
    proximoIntentoEn: f.proximoIntentoEn,
    respuesta:
      f.respuestaValida === null
        ? null
        : RespuestaDeLaDian.de({
            valida: f.respuestaValida,
            codigo: f.respuestaCodigo ?? '',
            descripcion: f.respuestaDescripcion ?? '',
            mensajes: f.respuestaMensajes,
          }),
  });
}

function estadoValido(estado: string): EstadoDelEnvio {
  if (!(ESTADOS_DEL_ENVIO as readonly string[]).includes(estado)) throw new Error(`Estado de envío desconocido: ${estado}`);
  return estado as EstadoDelEnvio;
}
