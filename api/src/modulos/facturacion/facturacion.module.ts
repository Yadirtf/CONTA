import { Module } from '@nestjs/common';
import { RELOJ, type Reloj } from '../../compartido/aplicacion/index.js';
import { RelojDelSistema } from '../../compartido/infraestructura/reloj-del-sistema.js';
import { FirmarDocumentoElectronico } from './aplicacion/comandos/firmar-documento-electronico.js';
import { GenerarXmlFactura } from './aplicacion/comandos/generar-xml-factura.js';
import { FIRMADOR_DE_DOCUMENTOS, type FirmadorDeDocumentos } from './aplicacion/puertos/firmador-de-documentos.js';
import {
  GENERADOR_DE_DOCUMENTO_ELECTRONICO,
  type GeneradorDeDocumentoElectronico,
} from './aplicacion/puertos/generador-de-documento-electronico.js';
import { FirmadorXadesDian } from './infraestructura/dian-directa/firma/firmador-xades-dian.js';
import { GeneradorUblDian } from './infraestructura/dian-directa/ubl/generador-ubl-dian.js';

// Composición: los puertos del generador y del firmador apuntan a la conexión directa con la DIAN
// (UBL 2.1 y XAdES-EPES). El proveedor de respaldo (HU-06.06) será otro adaptador de los mismos puertos.
@Module({
  providers: [
    { provide: RELOJ, useClass: RelojDelSistema },
    { provide: GENERADOR_DE_DOCUMENTO_ELECTRONICO, useClass: GeneradorUblDian },
    {
      provide: FIRMADOR_DE_DOCUMENTOS,
      useFactory: (reloj: Reloj) => new FirmadorXadesDian(reloj),
      inject: [RELOJ],
    },
    {
      provide: GenerarXmlFactura,
      useFactory: (generador: GeneradorDeDocumentoElectronico) => new GenerarXmlFactura(generador),
      inject: [GENERADOR_DE_DOCUMENTO_ELECTRONICO],
    },
    {
      provide: FirmarDocumentoElectronico,
      useFactory: (firmador: FirmadorDeDocumentos) => new FirmarDocumentoElectronico(firmador),
      inject: [FIRMADOR_DE_DOCUMENTOS],
    },
  ],
  exports: [GenerarXmlFactura, FirmarDocumentoElectronico],
})
export class FacturacionModule {}
