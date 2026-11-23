import type {
  ConfiguracionDian,
  DocumentoElectronico,
  GeneradorDeDocumentoElectronico,
} from '../../../aplicacion/puertos/generador-de-documento-electronico.js';
import type { Factura } from '../../../dominio/index.js';
import { el, grupo, serializar } from '../xml/escritor-xml.js';
import { exigirConfiguracion } from './configuracion-exigida.js';
import { CODIGO_DE_AMBIENTE, ESPACIOS_DE_NOMBRES } from './constantes-dian.js';
import { calcularCufe } from './cufe.js';
import { extensionesDian } from './extensiones-dian.js';
import { totalDeIva } from './impuestos-ubl.js';
import { lineaUbl } from './linea-ubl.js';
import { monto } from './montos.js';
import { participanteUbl } from './participante-ubl.js';
import { formaDePagoUbl, totalesUbl } from './totales-ubl.js';

type Ambiente = (typeof CODIGO_DE_AMBIENTE)[keyof typeof CODIGO_DE_AMBIENTE];

// Factura electrónica de venta según el anexo técnico 1.9 (Resolución DIAN 000165 de 2023), sin firmar.
// Este archivo solo ordena las secciones; cada una se arma en su propio archivo. El orden sigue
// UBL-Invoice-2.1.xsd y la prueba lo valida contra los XSD.

export class GeneradorUblDian implements GeneradorDeDocumentoElectronico {
  generar(factura: Factura, configuracion: ConfiguracionDian): DocumentoElectronico {
    exigirConfiguracion(configuracion);
    const ambiente = CODIGO_DE_AMBIENTE[configuracion.ambiente];
    const numero = factura.numero.aTexto();
    const cufe = cufeDe(factura, configuracion.claveTecnica, ambiente);

    const xml = serializar(
      grupo(
        'Invoice',
        [
          extensionesDian(factura, configuracion, cufe),
          el('cbc:UBLVersionID', 'UBL 2.1'),
          el('cbc:CustomizationID', '10'),
          el('cbc:ProfileID', 'DIAN 2.1: Factura Electrónica de Venta'),
          el('cbc:ProfileExecutionID', ambiente),
          el('cbc:ID', numero),
          el('cbc:UUID', cufe, {
            schemeID: ambiente,
            schemeName: 'CUFE-SHA384',
          }),
          el('cbc:IssueDate', factura.emision.fecha),
          el('cbc:IssueTime', factura.emision.hora),
          factura.formaDePago.vence !== null && el('cbc:DueDate', factura.formaDePago.vence),
          el('cbc:InvoiceTypeCode', '01'),
          el('cbc:DocumentCurrencyCode', 'COP'),
          el('cbc:LineCountNumeric', String(factura.lineas.length)),
          participanteUbl('cac:AccountingSupplierParty', factura.emisor, factura.numero.prefijo),
          participanteUbl('cac:AccountingCustomerParty', factura.adquirente),
          formaDePagoUbl(factura),
          totalDeIva(factura.totalIva, factura.subtotalesIva),
          totalesUbl(factura),
          ...factura.lineas.map(lineaUbl),
        ],
        ESPACIOS_DE_NOMBRES,
      ),
    );
    return { xml, cufe };
  }
}

function cufeDe(factura: Factura, claveTecnica: string, ambiente: Ambiente): string {
  return calcularCufe({
    numero: factura.numero.aTexto(),
    fecha: factura.emision.fecha,
    hora: factura.emision.hora,
    valorBruto: monto(factura.totalBruto),
    iva: monto(factura.totalIva),
    inc: '0.00',
    ica: '0.00',
    total: monto(factura.total),
    nitEmisor: factura.emisor.identificacion.numero,
    identificacionAdquirente: factura.adquirente.identificacion.numero,
    claveTecnica,
    ambiente,
  });
}
