import type { ContextoDeMiembro, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import { exigirPermiso, Permiso } from '../../../../compartido/dominio/index.js';
import { estadoDeLaVenta, type EstadoDeLaVenta, type Venta } from '../../dominio/index.js';
import type { RepositoriosDeVenta } from '../puertos/repositorios-de-venta.js';
import { ventaNoEncontrada } from '../ventas/errores-de-venta.js';

export interface VentaConEstado {
  readonly venta: Venta;
  readonly estado: EstadoDeLaVenta;
  /** Por qué la DIAN no la aceptó, si la rechazó. */
  readonly motivos: readonly string[];
}

/** HU-06.01: una venta con su estado ante la DIAN, para la pantalla «Listo». Pide Permiso.Vender. */
export class ConsultarVenta {
  constructor(private readonly unidadDeTrabajo: UnidadDeTrabajo<RepositoriosDeVenta>) {}

  ejecutar(contexto: ContextoDeMiembro, ventaId: string): Promise<VentaConEstado> {
    exigirPermiso(contexto.rol, Permiso.Vender);
    return this.unidadDeTrabajo.ejecutar(contexto, async ({ ventas }) => {
      const guardada = await ventas.conId(ventaId);
      if (!guardada) throw ventaNoEncontrada();
      const envio = await ventas.envioDe(ventaId);
      const estado = estadoDeLaVenta(envio?.estado ?? null);
      const motivos = estado === 'rechazada' ? (envio?.respuesta?.mensajes ?? []) : [];
      return { venta: guardada.venta, estado, motivos };
    });
  }
}
