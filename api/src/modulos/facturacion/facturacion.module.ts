import { Module } from '@nestjs/common';
import { GenerarXmlFactura } from './aplicacion/comandos/generar-xml-factura.js';
import {
  GENERADOR_DE_DOCUMENTO_ELECTRONICO,
  type GeneradorDeDocumentoElectronico,
} from './aplicacion/puertos/generador-de-documento-electronico.js';
import { GeneradorUblDian } from './infraestructura/dian-directa/generador-ubl-dian.js';

// Composición: el puerto del generador apunta a la conexión directa con la DIAN (UBL 2.1).
// El proveedor de respaldo (HU-06.06) será otro adaptador del mismo puerto.
@Module({
  providers: [
    { provide: GENERADOR_DE_DOCUMENTO_ELECTRONICO, useClass: GeneradorUblDian },
    {
      provide: GenerarXmlFactura,
      useFactory: (generador: GeneradorDeDocumentoElectronico) => new GenerarXmlFactura(generador),
      inject: [GENERADOR_DE_DOCUMENTO_ELECTRONICO],
    },
  ],
  exports: [GenerarXmlFactura],
})
export class FacturacionModule {}
