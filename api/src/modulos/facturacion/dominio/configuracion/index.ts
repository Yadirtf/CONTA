// Configuración DIAN de la empresa (HU-07.04): lo que el dueño carga para poder facturar.
export { datosFiscalesDelFacturador, type DatosFiscalesEscritos, RESPONSABILIDADES_DEL_FACTURADOR } from './datos-fiscales.js';
export { loQueFalta, type LoGuardado, type LoQueFalta } from './lo-que-falta.js';
export { contenidoDeLaResolucion, resolucionNueva, type ResolucionEscrita, type ResolucionNueva } from './resolucion-nueva.js';
export { claveTecnicaValida, finalDelPin, pinValido } from './secretos-dian.js';
export {
  SECCIONES_DE_CONFIGURACION,
  seccionDeResolucion,
  seccionDeSoftware,
  type SeccionDeConfiguracion,
} from './seccion-de-configuracion.js';
export { type FabricanteEscrito, softwareDian, type SoftwareDian, type SoftwareEscrito } from './software-dian.js';
