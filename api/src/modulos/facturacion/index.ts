// API pública del módulo de facturación para otros módulos.
export { GenerarXmlFactura } from './aplicacion/comandos/generar-xml-factura.js';
export type { ConfiguracionDian, DocumentoElectronico } from './aplicacion/puertos/generador-de-documento-electronico.js';
export * from './dominio/index.js';
export { FacturacionModule } from './facturacion.module.js';
