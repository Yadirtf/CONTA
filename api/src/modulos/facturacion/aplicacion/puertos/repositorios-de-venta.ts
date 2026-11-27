import type { ColaDeEmisiones } from './cola-de-emisiones.js';
import type { RepositorioDeCorreos } from './repositorio-de-correos.js';
import type { NumeracionDeLaEmpresa } from './numeracion-de-la-empresa.js';
import type { RepositorioDeVentas } from './repositorio-de-ventas.js';

/** Lo que una transacción de ventas puede tocar. */
export interface RepositoriosDeVenta {
  readonly ventas: RepositorioDeVentas;
  readonly numeracion: NumeracionDeLaEmpresa;
  readonly emisiones: ColaDeEmisiones;
  readonly correos: RepositorioDeCorreos;
}
