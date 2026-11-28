import type { ClaseDeDocumento } from '../documentos/clase-de-documento.js';

/** Partes de la configuración DIAN que se guardan por separado y quedan en la bitácora (HU-07.04). */
export const SECCIONES_DE_CONFIGURACION = [
  'datos-fiscales',
  'resolucion-factura',
  'resolucion-pos',
  'software-factura',
  'software-pos',
  'preferencias',
] as const;
export type SeccionDeConfiguracion = (typeof SECCIONES_DE_CONFIGURACION)[number];

export const seccionDeResolucion = (clase: ClaseDeDocumento): SeccionDeConfiguracion => `resolucion-${clase}`;
export const seccionDeSoftware = (clase: ClaseDeDocumento): SeccionDeConfiguracion => `software-${clase}`;
