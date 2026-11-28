import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import { asociadoALaResolucion, type CustodiaDeSecretos } from '../../../aplicacion/puertos/custodia-de-secretos.js';
import type { NumeracionDeLaEmpresa, ResolucionVigente } from '../../../aplicacion/puertos/numeracion-de-la-empresa.js';
import { type ClaseDeDocumento, claseDeDocumento, type Participante, ResolucionDeNumeracion } from '../../../dominio/index.js';
import { participanteDeFila } from '../configuracion/datos-fiscales-de-fila.js';
import { datosFiscales, type FilaDeResolucion, resoluciones } from './tablas-ventas.js';

/** Datos fiscales y resoluciones de la empresa de la transacción (RLS). Solo `siguiente` cambia, y solo sube. */
export class NumeracionPostgres implements NumeracionDeLaEmpresa {
  constructor(
    private readonly ejecutor: Ejecutor,
    private readonly custodia: CustodiaDeSecretos,
  ) {}

  /**
   * FOR SHARE: mientras la venta no se confirma, el dueño no puede cambiar el NIT con que sale (hallazgo B3). Su
   * cambio espera, y el trigger nit_fijo_con_ventas ya ve la venta.
   */
  async emisor(): Promise<Participante | null> {
    const [f] = await this.ejecutor.select().from(datosFiscales).limit(1).for('share');
    return f ? participanteDeFila(f) : null;
  }

  async claveTecnica(resolucionId: string): Promise<string | null> {
    const [f] = await this.ejecutor
      .select({ empresaId: resoluciones.empresaId, cifrada: resoluciones.claveTecnicaCifrada })
      .from(resoluciones)
      .where(eq(resoluciones.id, resolucionId))
      .limit(1);
    // Atada a su empresa y su resolución: una clave copiada a otra fila no abre (y la emisión falla).
    return f?.cifrada ? this.custodia.descifrar(f.cifrada, asociadoALaResolucion(f.empresaId, resolucionId)) : null;
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
