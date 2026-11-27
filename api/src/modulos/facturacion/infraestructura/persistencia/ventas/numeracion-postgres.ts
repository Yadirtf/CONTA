import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { Identificacion, Nit } from '../../../../../compartido/dominio/index.js';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { NumeracionDeLaEmpresa, ResolucionVigente } from '../../../aplicacion/puertos/numeracion-de-la-empresa.js';
import { type ClaseDeDocumento, claseDeDocumento, participante, type Participante, ResolucionDeNumeracion } from '../../../dominio/index.js';
import { datosFiscales, type FilaDeResolucion, resoluciones } from './tablas-ventas.js';

/** Datos fiscales y resoluciones de la empresa de la transacción (RLS). Solo `siguiente` cambia, y solo sube. */
export class NumeracionPostgres implements NumeracionDeLaEmpresa {
  constructor(private readonly ejecutor: Ejecutor) {}

  async emisor(): Promise<Participante | null> {
    const [f] = await this.ejecutor.select().from(datosFiscales).limit(1);
    if (!f) return null;
    return participante({
      identificacion: Identificacion.nit(Nit.de(f.nit)),
      razonSocial: f.razonSocial,
      tipoDePersona: f.tipoDePersona === 'natural' ? 'natural' : 'juridica',
      responsabilidadesFiscales: f.responsabilidadesFiscales,
      responsableDeIva: f.responsableDeIva,
      direccion: { codigoMunicipio: f.codigoMunicipio, ciudad: f.ciudad, departamento: f.departamento, linea: f.direccion },
      correo: f.correo,
    });
  }

  async resolucionVigente(fecha: string, clase: ClaseDeDocumento): Promise<ResolucionVigente | null> {
    const [fila] = await this.ejecutor
      .select()
      .from(resoluciones)
      .where(
        and(
          eq(resoluciones.clase, clase),
          lte(resoluciones.vigenteDesde, fecha),
          gte(resoluciones.vigenteHasta, fecha),
          sql`${resoluciones.siguiente} <= ${resoluciones.hasta}`,
        ),
      )
      .orderBy(desc(resoluciones.vigenteDesde), desc(resoluciones.creadaEn))
      .limit(1);
    return fila ? { id: fila.id, resolucion: resolucionDe(fila) } : null;
  }

  async resolucion(id: string): Promise<ResolucionDeNumeracion | null> {
    const [fila] = await this.ejecutor.select().from(resoluciones).where(eq(resoluciones.id, id)).limit(1);
    return fila ? resolucionDe(fila) : null;
  }

  async reservarConsecutivo(resolucionId: string): Promise<number | null> {
    // El UPDATE bloquea la fila hasta el final de la transacción: dos ventas nunca reciben el mismo número, y si la
    // venta no se guarda, el rollback lo devuelve.
    const filas = await this.ejecutor
      .update(resoluciones)
      .set({ siguiente: sql`${resoluciones.siguiente} + 1` })
      .where(and(eq(resoluciones.id, resolucionId), sql`${resoluciones.siguiente} <= ${resoluciones.hasta}`))
      .returning({ tomado: sql<string>`${resoluciones.siguiente} - 1` });
    const tomado = filas[0]?.tomado;
    return tomado === undefined ? null : Number(tomado);
  }
}

function resolucionDe(f: FilaDeResolucion): ResolucionDeNumeracion {
  return ResolucionDeNumeracion.crear({
    numero: f.numero,
    prefijo: f.prefijo,
    desde: f.desde,
    hasta: f.hasta,
    vigenteDesde: f.vigenteDesde,
    vigenteHasta: f.vigenteHasta,
    clase: claseDeDocumento(f.clase),
  });
}
