import type { Factura } from '../../dominio/index.js';
import type {
  ConfiguracionDian,
  DocumentoElectronico,
  GeneradorDeDocumentoElectronico,
} from '../puertos/generador-de-documento-electronico.js';

/**
 * HU-02.01: genera el XML UBL 2.1 sin firmar de una factura ya validada por el dominio, con su CUFE.
 * La firma (HU-02.02) y el envío a la DIAN (HU-02.03) son pasos siguientes.
 */
export class GenerarXmlFactura {
  constructor(private readonly generador: GeneradorDeDocumentoElectronico) {}

  ejecutar(factura: Factura, configuracion: ConfiguracionDian): DocumentoElectronico {
    return this.generador.generar(factura, configuracion);
  }
}
