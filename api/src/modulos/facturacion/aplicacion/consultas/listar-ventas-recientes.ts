import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { exigirPermiso, Permiso } from '../../../../compartido/dominio/index.js';
import { estadoDeLaVenta, type EstadoDeLaVenta } from '../../dominio/index.js';
import type { RepositoriosDeVenta } from '../puertos/repositorios-de-venta.js';

/** Cuántas ventas muestra «Mis ventas»: las del mostrador reciente, no un informe. */
export const VENTAS_RECIENTES = 50;

export interface VentaReciente {
  readonly id: string;
  readonly numero: string;
  readonly emitidaEn: Date;
  readonly comprador: string;
  readonly total: string;
  readonly estado: EstadoDeLaVenta;
}

/** HU-06.08: «Mis ventas», las últimas ventas con su estado, para volver a compartir una. Pide Permiso.Vender. */
export class ListarVentasRecientes {
  constructor(private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeVenta>) {}

  ejecutar(contexto: ContextoDeMiembro): Promise<VentaReciente[]> {
    exigirPermiso(contexto.rol, Permiso.Vender);
    return this.unidadDeTrabajo.ejecutar(contexto, async ({ ventas }) =>
      (await ventas.recientes(VENTAS_RECIENTES)).map(({ estadoDelEnvio, ...resto }) => ({
        ...resto,
        estado: estadoDeLaVenta(estadoDelEnvio),
      })),
    );
  }
}
