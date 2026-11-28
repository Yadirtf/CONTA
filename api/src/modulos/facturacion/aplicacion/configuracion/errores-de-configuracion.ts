import { ErrorDominio } from '../../../../compartido/dominio/index.js';

// Rechazos de la configuración DIAN que dependen de lo guardado (HU-07.04). Códigos estables para la app; los
// mensajes nunca repiten un PIN ni una clave técnica.

export const nitConVentas = () =>
  new ErrorDominio('configuracion.nit-con-ventas', 'Tu negocio ya facturó con ese NIT: no se puede cambiar. Escríbenos si es un error');

/** Resoluciones de una clase que una empresa puede tener: la DIAN autoriza pocas a la vez (hallazgo B5). */
export const MAXIMO_DE_RESOLUCIONES_POR_CLASE = 20;

export const demasiadasResoluciones = () =>
  new ErrorDominio('resolucion.demasiadas', `Tu negocio ya tiene ${MAXIMO_DE_RESOLUCIONES_POR_CLASE} resoluciones de ese documento. Escríbenos`);

export const resolucionIdEnUso = () =>
  new ErrorDominio('resolucion.id-en-uso', 'Ese id ya es de otra resolución: la app debe usar un id nuevo');

export const resolucionRepetida = () =>
  new ErrorDominio('resolucion.repetida', 'Ya guardaste una resolución con ese número y prefijo');

export const rangoCruzado = () =>
  new ErrorDominio('resolucion.rango-cruzado', 'Ese rango se cruza con otra resolución del mismo prefijo');

/** La clave con que se cifran el PIN y la clave técnica no está configurada en el servidor. */
export class SecretosNoDisponibles extends Error {
  constructor() {
    super('La custodia de secretos DIAN no tiene clave configurada');
    this.name = 'SecretosNoDisponibles';
  }
}
