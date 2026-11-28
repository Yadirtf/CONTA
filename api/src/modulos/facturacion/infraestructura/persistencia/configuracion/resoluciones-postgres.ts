import { asc, eq, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type {
  ResolucionesGuardadas,
  ResolucionGuardada,
  ResultadoDeAgregar,
} from '../../../aplicacion/puertos/repositorios-de-configuracion.js';
import { claseDeDocumento, ResolucionDeNumeracion, type ResolucionNueva } from '../../../dominio/index.js';
import { type FilaDeResolucion, resoluciones } from '../ventas/tablas-ventas.js';
import { errorDePostgres, VIOLACION_DE_EXCLUSION, VIOLACION_DE_UNICIDAD } from './errores-de-postgres.js';

const EMPRESA = sql`conta_sistema.empresa_actual()`;
const NUMERO_Y_PREFIJO_UNICOS = 'resoluciones_de_numeracion_empresa_id_prefijo_numero_key';

/**
 * Resoluciones de la empresa de la transacción (RLS). conta_api solo inserta: no hay UPDATE (salvo `siguiente`, que
 * mueve la venta) ni DELETE, así que una resolución guardada no cambia nunca.
 */
export class ResolucionesPostgres implements ResolucionesGuardadas {
  constructor(private readonly ejecutor: Ejecutor) {}

  async listar(): Promise<ResolucionGuardada[]> {
    const filas = await this.ejecutor.select().from(resoluciones).orderBy(asc(resoluciones.clase), asc(resoluciones.creadaEn));
    return filas.map(guardadaDe);
  }

  async agregar(id: string, n: ResolucionNueva, claveTecnicaCifrada: string | null, huellaDelPedido: string): Promise<ResultadoDeAgregar> {
    const r = n.resolucion;
    // Un punto de guardado: si la base rechaza la fila, la transacción sigue viva para responder con palabras.
    const insertadas = await this.ejecutor
      .transaction((tx) =>
        tx
          .insert(resoluciones)
          .values({
            empresaId: EMPRESA,
            id,
            numero: r.numero,
            prefijo: r.prefijo,
            desde: r.desde,
            hasta: r.hasta,
            vigenteDesde: r.vigenteDesde,
            vigenteHasta: r.vigenteHasta,
            siguiente: n.primerNumero,
            clase: r.clase,
            claveTecnicaCifrada,
            huellaDelPedido,
          })
          .onConflictDoNothing({ target: [resoluciones.empresaId, resoluciones.id] })
          .returning({ id: resoluciones.id }),
      )
      .catch((error: unknown) => {
        const { codigo, restriccion } = errorDePostgres(error);
        if (codigo === VIOLACION_DE_UNICIDAD && restriccion === NUMERO_Y_PREFIJO_UNICOS) return 'repetida' as const;
        if (codigo === VIOLACION_DE_EXCLUSION) return 'rango-cruzado' as const;
        throw error;
      });
    if (typeof insertadas === 'string') return insertadas;
    if (insertadas.length === 1) return 'agregada';
    const [previa] = await this.ejecutor.select().from(resoluciones).where(eq(resoluciones.id, id)).limit(1);
    // Es un reintento solo si es el mismo pedido completo, también la clave técnica y el primer número (hallazgo M1).
    return previa?.huellaDelPedido === huellaDelPedido ? 'ya-existia' : 'id-en-uso';
  }
}

function guardadaDe(f: FilaDeResolucion): ResolucionGuardada {
  return {
    id: f.id,
    resolucion: ResolucionDeNumeracion.crear({
      numero: f.numero,
      prefijo: f.prefijo,
      desde: f.desde,
      hasta: f.hasta,
      vigenteDesde: f.vigenteDesde,
      vigenteHasta: f.vigenteHasta,
      clase: claseDeDocumento(f.clase),
    }),
    siguiente: f.siguiente,
    conClaveTecnica: f.claveTecnicaCifrada !== null,
  };
}
