// Dominio de facturación (EP-02, EP-06). Sin frameworks ni Node: solo reglas.
export { Factura, type FormaDePago, type SubtotalIva } from './entidades/factura.js';
export { LineaDeFactura } from './entidades/linea-de-factura.js';
export { ResolucionDeNumeracion } from './entidades/resolucion-de-numeracion.js';
// La identificación vive en el dominio compartido desde HU-05.01 (la usan también los clientes del catálogo).
export { Identificacion, TIPOS_DE_IDENTIFICACION, type TipoDeIdentificacion } from '../../../compartido/dominio/index.js';
export { MomentoDeEmision } from './objetos-valor/momento-de-emision.js';
export { NumeroDeFactura } from './objetos-valor/numero-de-factura.js';
export { participante, type Direccion, type Participante } from './objetos-valor/participante.js';
export { TARIFAS_IVA, tarifaIva, type TarifaIva } from './objetos-valor/tarifa-iva.js';
export { EnvioDian, type DatosDelEnvio } from './envio-dian/envio-dian.js';
export { ESTADOS_DEL_ENVIO, esEstadoFinal, type EstadoDelEnvio } from './envio-dian/estado-del-envio.js';
export { esperaDeConsulta, esperaTrasFalla, MAXIMO_DE_INTENTOS } from './envio-dian/politica-de-reintentos.js';
export { RespuestaDeLaDian, type ResultadoDeValidacion } from './envio-dian/respuesta-de-la-dian.js';
export * from './documentos/index.js';
export * from './ventas/index.js';
export * from './comprobante/index.js';
export * from './correo/index.js';
export * from './configuracion/index.js';
