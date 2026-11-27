import type {
  ConfiguracionDian,
  DocumentoElectronico,
  GeneradorDeDocumentoElectronico,
} from '../../../aplicacion/puertos/generador-de-documento-electronico.js';
import type { Factura } from '../../../dominio/index.js';
import { el, grupo, serializar } from '../xml/escritor-xml.js';
import { exigirConfiguracion } from './configuracion-exigida.js';
import { CODIGO_DE_AMBIENTE, ESPACIOS_DE_NOMBRES } from './constantes-dian.js';
import { codigoUnicoDelDocumento } from './codigo-unico.js';
import { extensionesDian } from './extensiones-dian.js';
import { extensionesDelPos } from './extensiones-pos.js';
import { totalDeIva } from './impuestos-ubl.js';
import { lineaUbl } from './linea-ubl.js';
import { participanteUbl } from './participante-ubl.js';
import { PERFILES_UBL } from './perfil-ubl.js';
import { formaDePagoUbl, totalesUbl } from './totales-ubl.js';

// Factura electrónica de venta según el anexo técnico 1.9, o tiquete POS electrónico según el anexo del documento
// equivalente v1.0 (los dos de la Resolución DIAN 000165 de 2023), sin firmar. Lo que cambia entre los dos está en
// perfil-ubl.ts, codigo-unico.ts y extensiones-pos.ts. Este archivo solo ordena las secciones; cada una se arma en su
// propio archivo. El orden sigue UBL-Invoice-2.1.xsd y la prueba lo valida contra los XSD.

export class GeneradorUblDian implements GeneradorDeDocumentoElectronico {
  generar(factura: Factura, configuracion: ConfiguracionDian): DocumentoElectronico {
    exigirConfiguracion(configuracion, factura.clase);
    const ambiente = CODIGO_DE_AMBIENTE[configuracion.ambiente];
    const perfil = PERFILES_UBL[factura.clase];
    const numero = factura.numero.aTexto();
    const cufe = codigoUnicoDelDocumento(factura, configuracion, ambiente);
    const adicionales = factura.clase === 'pos' && configuracion.fabricante ? extensionesDelPos(factura, configuracion.fabricante) : [];

    const xml = serializar(
      grupo(
        'Invoice',
        [
          extensionesDian(factura, configuracion, cufe, adicionales),
          el('cbc:UBLVersionID', 'UBL 2.1'),
          el('cbc:CustomizationID', '10'),
          el('cbc:ProfileID', perfil.perfil),
          el('cbc:ProfileExecutionID', ambiente),
          el('cbc:ID', numero),
          el('cbc:UUID', cufe, {
            schemeID: ambiente,
            schemeName: perfil.esquemaDelCodigoUnico,
          }),
          el('cbc:IssueDate', factura.emision.fecha),
          el('cbc:IssueTime', factura.emision.hora),
          factura.formaDePago.vence !== null && el('cbc:DueDate', factura.formaDePago.vence),
          el('cbc:InvoiceTypeCode', perfil.tipoDeDocumento),
          el('cbc:DocumentCurrencyCode', 'COP'),
          el('cbc:LineCountNumeric', String(factura.lineas.length)),
          participanteUbl('cac:AccountingSupplierParty', factura.emisor, factura.numero.prefijo),
          participanteUbl('cac:AccountingCustomerParty', factura.adquirente),
          formaDePagoUbl(factura),
          // Si todo lo vendido está excluido del IVA, la factura no lleva TaxTotal de IVA.
          factura.subtotalesIva.length > 0 && totalDeIva(factura.totalIva, factura.subtotalesIva),
          totalesUbl(factura),
          ...factura.lineas.map(lineaUbl),
        ],
        ESPACIOS_DE_NOMBRES,
      ),
    );
    return { xml, cufe };
  }
}
