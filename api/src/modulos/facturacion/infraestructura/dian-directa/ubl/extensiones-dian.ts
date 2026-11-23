import { Nit } from '../../../../../compartido/dominio/index.js';
import type { ConfiguracionDian } from '../../../aplicacion/puertos/generador-de-documento-electronico.js';
import type { Factura } from '../../../dominio/index.js';
import { el, grupo, type NodoXml } from '../xml/escritor-xml.js';
import { AGENCIA_DIAN, NIT_DIAN, URL_DE_CONSULTA } from './constantes-dian.js';
import { codigoDeSeguridadDelSoftware } from './cufe.js';

/**
 * ext:UBLExtensions con la extensión de la DIAN (sts:DianExtensions, anexo 6.1).
 * La firma va en una segunda UBLExtension que agrega el firmador (HU-02.02).
 */
export function extensionesDian(factura: Factura, configuracion: ConfiguracionDian, cufe: string): NodoXml {
  return grupo('ext:UBLExtensions', [
    grupo('ext:UBLExtension', [
      grupo('ext:ExtensionContent', [
        grupo('sts:DianExtensions', [
          controlDeNumeracion(factura),
          grupo('sts:InvoiceSource', [
            el('cbc:IdentificationCode', 'CO', {
              listAgencyID: '6',
              listAgencyName: 'United Nations Economic Commission for Europe',
              listSchemeURI: 'urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1',
            }),
          ]),
          proveedorDelSoftware(configuracion),
          el(
            'sts:SoftwareSecurityCode',
            codigoDeSeguridadDelSoftware(configuracion.idSoftware, configuracion.pinSoftware, factura.numero.aTexto()),
            AGENCIA_DIAN,
          ),
          grupo('sts:AuthorizationProvider', [
            el('sts:AuthorizationProviderID', NIT_DIAN.numero, atributosDeNit(NIT_DIAN)),
          ]),
          el('sts:QRCode', `${URL_DE_CONSULTA[configuracion.ambiente]}?documentkey=${cufe}`),
        ]),
      ]),
    ]),
  ]);
}

/** Resolución de numeración que autoriza el documento (sts:InvoiceControl). */
function controlDeNumeracion({ resolucion }: Factura): NodoXml {
  return grupo('sts:InvoiceControl', [
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
  ]);
}

function proveedorDelSoftware(configuracion: ConfiguracionDian): NodoXml {
  const proveedor = Nit.de(configuracion.nitProveedorSoftware);
  return grupo('sts:SoftwareProvider', [
    el('sts:ProviderID', proveedor.numero, atributosDeNit(proveedor)),
    el('sts:SoftwareID', configuracion.idSoftware, AGENCIA_DIAN),
  ]);
}

/** El anexo pide el dígito de verificación en schemeID y el tipo de documento (31, NIT) en schemeName. */
function atributosDeNit(nit: Nit): Record<string, string> {
  return {
    ...AGENCIA_DIAN,
    schemeID: String(nit.digitoVerificacion),
    schemeName: '31',
  };
}
