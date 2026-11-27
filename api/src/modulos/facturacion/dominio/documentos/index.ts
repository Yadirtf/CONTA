// Documentos que salen de una venta (HU-06.02): factura electrónica o tiquete POS electrónico.
export {
  CLASES_DE_DOCUMENTO,
  claseDeDocumento,
  type ClaseDeDocumento,
  type CodigoUnico,
  codigoUnicoDe,
  NOMBRE_CORTO_DEL_DOCUMENTO,
  NOMBRE_DEL_DOCUMENTO,
} from './clase-de-documento.js';
export {
  type CircunstanciasDeLaVenta,
  claseParaLaVenta,
  PREFERENCIAS_DE_DOCUMENTO,
  preferenciaDeDocumento,
  type PreferenciaDeDocumento,
} from './eleccion-del-documento.js';
export { puntoDeVenta, type PuntoDeVenta } from './punto-de-venta.js';
export { cabeEnPos, topeDelPos, UVT_MAXIMAS_DEL_POS } from './tope-del-pos.js';
export { uvtDe } from './valor-de-la-uvt.js';
