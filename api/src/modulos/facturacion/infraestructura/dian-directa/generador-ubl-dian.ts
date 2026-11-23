import { DecimalExacto, type Dinero, Nit } from '../../../../compartido/dominio/index.js';
import type {
  ConfiguracionDian,
  DocumentoElectronico,
  GeneradorDeDocumentoElectronico,
} from '../../aplicacion/puertos/generador-de-documento-electronico.js';
import type { Factura, LineaDeFactura, Participante } from '../../dominio/index.js';
import { calcularCufe, codigoDeSeguridadDelSoftware } from './cufe.js';
import { el, grupo, serializar, type NodoXml } from './escritor-xml.js';

// Factura electrónica de venta según el anexo técnico 1.9 (Resolución DIAN 000165 de 2023), sin firmar.
// El orden de los elementos sigue el esquema UBL-Invoice-2.1.xsd; la prueba lo valida contra los XSD.

const NS = {
  xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
  'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
  'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
  'xmlns:ext': 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
  'xmlns:sts': 'dian:gov:co:facturaelectronica:Structures-2-1',
};

const DIAN = { schemeAgencyID: '195', schemeAgencyName: 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)' };
const NIT_DIAN = Nit.de('800197268');
const URL_CONSULTA = {
  habilitacion: 'https://catalogo-vpfe-hab.dian.gov.co/document/searchqr',
  produccion: 'https://catalogo-vpfe.dian.gov.co/document/searchqr',
} as const;
const AMBIENTE = { produccion: '1', habilitacion: '2' } as const;
const COP = { currencyID: 'COP' };

export class GeneradorUblDian implements GeneradorDeDocumentoElectronico {
  generar(factura: Factura, configuracion: ConfiguracionDian): DocumentoElectronico {
    exigirConfiguracion(configuracion);
    const ambiente = AMBIENTE[configuracion.ambiente];
    const numero = factura.numero.aTexto();
    const cufe = calcularCufe({
      numero,
      fecha: factura.emision.fecha,
      hora: factura.emision.hora,
      valorBruto: monto(factura.totalBruto),
      iva: monto(factura.totalIva),
      inc: '0.00',
      ica: '0.00',
      total: monto(factura.total),
      nitEmisor: factura.emisor.identificacion.numero,
      identificacionAdquirente: factura.adquirente.identificacion.numero,
      claveTecnica: configuracion.claveTecnica,
      ambiente,
    });

    const xml = serializar(
      grupo(
        'Invoice',
        [
          extensiones(factura, configuracion, cufe),
          el('cbc:UBLVersionID', 'UBL 2.1'),
          el('cbc:CustomizationID', '10'),
          el('cbc:ProfileID', 'DIAN 2.1: Factura Electrónica de Venta'),
          el('cbc:ProfileExecutionID', ambiente),
          el('cbc:ID', numero),
          el('cbc:UUID', cufe, { schemeID: ambiente, schemeName: 'CUFE-SHA384' }),
          el('cbc:IssueDate', factura.emision.fecha),
          el('cbc:IssueTime', factura.emision.hora),
          factura.formaDePago.vence !== null && el('cbc:DueDate', factura.formaDePago.vence),
          el('cbc:InvoiceTypeCode', '01'),
          el('cbc:DocumentCurrencyCode', 'COP'),
          el('cbc:LineCountNumeric', String(factura.lineas.length)),
          grupo('cac:AccountingSupplierParty', [
            el('cbc:AdditionalAccountID', tipoDePersona(factura.emisor)),
            parte(factura.emisor, factura.numero.prefijo),
          ]),
          grupo('cac:AccountingCustomerParty', [
            el('cbc:AdditionalAccountID', tipoDePersona(factura.adquirente)),
            parte(factura.adquirente, null),
          ]),
          grupo('cac:PaymentMeans', [
            el('cbc:ID', factura.formaDePago.metodo === 'contado' ? '1' : '2'),
            el('cbc:PaymentMeansCode', factura.formaDePago.medio),
            factura.formaDePago.vence !== null && el('cbc:PaymentDueDate', factura.formaDePago.vence),
          ]),
          totalDeIva(factura.totalIva, factura.subtotalesIva),
          grupo('cac:LegalMonetaryTotal', [
            el('cbc:LineExtensionAmount', monto(factura.totalBruto), COP),
            el('cbc:TaxExclusiveAmount', monto(factura.totalBruto), COP),
            el('cbc:TaxInclusiveAmount', monto(factura.total), COP),
            el('cbc:AllowanceTotalAmount', '0.00', COP),
            el('cbc:ChargeTotalAmount', '0.00', COP),
            el('cbc:PayableAmount', monto(factura.total), COP),
          ]),
          ...factura.lineas.map(linea),
        ],
        NS,
      ),
    );
    return { xml, cufe };
  }
}

function extensiones(factura: Factura, configuracion: ConfiguracionDian, cufe: string): NodoXml {
  const { resolucion } = factura;
  const proveedor = Nit.de(configuracion.nitProveedorSoftware);
  return grupo('ext:UBLExtensions', [
    grupo('ext:UBLExtension', [
      grupo('ext:ExtensionContent', [
        grupo('sts:DianExtensions', [
          grupo('sts:InvoiceControl', [
            el('sts:InvoiceAuthorization', resolucion.numero),
            grupo('sts:AuthorizationPeriod', [
              el('cbc:StartDate', resolucion.vigenteDesde),
              el('cbc:EndDate', resolucion.vigenteHasta),
            ]),
            grupo('sts:AuthorizedInvoices', [
              resolucion.prefijo !== '' && el('sts:Prefix', resolucion.prefijo),
              el('sts:From', String(resolucion.desde)),
              el('sts:To', String(resolucion.hasta)),
            ]),
          ]),
          grupo('sts:InvoiceSource', [
            el('cbc:IdentificationCode', 'CO', {
              listAgencyID: '6',
              listAgencyName: 'United Nations Economic Commission for Europe',
              listSchemeURI: 'urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1',
            }),
          ]),
          grupo('sts:SoftwareProvider', [
            el('sts:ProviderID', proveedor.numero, { ...DIAN, schemeID: String(proveedor.digitoVerificacion), schemeName: '31' }),
            el('sts:SoftwareID', configuracion.idSoftware, DIAN),
          ]),
          el(
            'sts:SoftwareSecurityCode',
            codigoDeSeguridadDelSoftware(configuracion.idSoftware, configuracion.pinSoftware, factura.numero.aTexto()),
            DIAN,
          ),
          grupo('sts:AuthorizationProvider', [
            el('sts:AuthorizationProviderID', NIT_DIAN.numero, {
              ...DIAN,
              schemeID: String(NIT_DIAN.digitoVerificacion),
              schemeName: '31',
            }),
          ]),
          el('sts:QRCode', `${URL_CONSULTA[configuracion.ambiente]}?documentkey=${cufe}`),
        ]),
      ]),
    ]),
  ]);
}

function parte(p: Participante, prefijo: string | null): NodoXml {
  const id = p.identificacion;
  const atributosId: Record<string, string> = { ...DIAN, schemeName: id.tipo };
  if (id.digitoVerificacion !== null) atributosId['schemeID'] = String(id.digitoVerificacion);
  const direccion = p.direccion && direccionUbl(p.direccion);
  return grupo('cac:Party', [
    p.tipoDePersona === 'natural' && grupo('cac:PartyIdentification', [el('cbc:ID', id.numero, atributosId)]),
    grupo('cac:PartyName', [el('cbc:Name', p.razonSocial)]),
    direccion && grupo('cac:PhysicalLocation', [grupo('cac:Address', direccion)]),
    grupo('cac:PartyTaxScheme', [
      el('cbc:RegistrationName', p.razonSocial),
      el('cbc:CompanyID', id.numero, atributosId),
      el('cbc:TaxLevelCode', p.responsabilidadesFiscales.join(';')),
      direccion && grupo('cac:RegistrationAddress', direccion),
      p.responsableDeIva
        ? grupo('cac:TaxScheme', [el('cbc:ID', '01'), el('cbc:Name', 'IVA')])
        : grupo('cac:TaxScheme', [el('cbc:ID', 'ZZ'), el('cbc:Name', 'No aplica')]),
    ]),
    grupo('cac:PartyLegalEntity', [
      el('cbc:RegistrationName', p.razonSocial),
      el('cbc:CompanyID', id.numero, atributosId),
      prefijo !== null && prefijo !== '' && grupo('cac:CorporateRegistrationScheme', [el('cbc:ID', prefijo)]),
    ]),
    p.correo !== null && grupo('cac:Contact', [el('cbc:ElectronicMail', p.correo)]),
  ]);
}

function direccionUbl(d: NonNullable<Participante['direccion']>): NodoXml[] {
  return [
    el('cbc:ID', d.codigoMunicipio),
    el('cbc:CityName', d.ciudad),
    el('cbc:CountrySubentity', d.departamento),
    el('cbc:CountrySubentityCode', d.codigoMunicipio.slice(0, 2)),
    grupo('cac:AddressLine', [el('cbc:Line', d.linea)]),
    grupo('cac:Country', [el('cbc:IdentificationCode', 'CO'), el('cbc:Name', 'Colombia', { languageID: 'es' })]),
  ];
}

function totalDeIva(total: Dinero, subtotales: Factura['subtotalesIva']): NodoXml {
  return grupo('cac:TaxTotal', [
    el('cbc:TaxAmount', monto(total), COP),
    ...subtotales.map((s) => subtotalDeIva(s.base, s.valor, s.tarifa)),
  ]);
}

function subtotalDeIva(base: Dinero, valor: Dinero, tarifa: string): NodoXml {
  return grupo('cac:TaxSubtotal', [
    el('cbc:TaxableAmount', monto(base), COP),
    el('cbc:TaxAmount', monto(valor), COP),
    grupo('cac:TaxCategory', [
      el('cbc:Percent', DecimalExacto.desde(tarifa).aTexto(2)),
      grupo('cac:TaxScheme', [el('cbc:ID', '01'), el('cbc:Name', 'IVA')]),
    ]),
  ]);
}

function linea(l: LineaDeFactura, i: number): NodoXml {
  return grupo('cac:InvoiceLine', [
    el('cbc:ID', String(i + 1)),
    el('cbc:InvoicedQuantity', l.cantidad.aTexto(), { unitCode: l.unidad }),
    el('cbc:LineExtensionAmount', monto(l.valor), COP),
    grupo('cac:TaxTotal', [el('cbc:TaxAmount', monto(l.iva), COP), subtotalDeIva(l.valor, l.iva, l.tarifaIva)]),
    grupo('cac:Item', [
      el('cbc:Description', l.descripcion),
      l.codigo !== null && grupo('cac:StandardItemIdentification', [el('cbc:ID', l.codigo, { schemeID: '999' })]),
    ]),
    grupo('cac:Price', [
      el('cbc:PriceAmount', l.precioUnitario.monto.aTexto(2), COP),
      el('cbc:BaseQuantity', '1', { unitCode: l.unidad }),
    ]),
  ]);
}

/** Monto con exactamente 2 decimales. Los totales ya vienen redondeados; truncar es lo que pide el CUFE (11.2). */
function monto(d: Dinero): string {
  return d.monto.redondear(2, 'hacia-cero').aTexto(2);
}

function tipoDePersona(p: Participante): string {
  return p.tipoDePersona === 'juridica' ? '1' : '2';
}

function exigirConfiguracion(c: ConfiguracionDian): void {
  // Los mensajes nunca incluyen la clave técnica ni el PIN: son valores reservados.
  if (!/^[\w-]{1,100}$/.test(c.claveTecnica)) throw new Error('Configuración DIAN: falta la clave técnica o no es válida');
  if (!/^[\w-]{1,100}$/.test(c.idSoftware)) throw new Error('Configuración DIAN: falta el identificador del software');
  if (!/^\S{1,100}$/.test(c.pinSoftware)) throw new Error('Configuración DIAN: falta el PIN del software');
}
