import { DOMParser } from '@xmldom/xmldom';
import { Identificacion, type TipoDeIdentificacion } from '../../../../../compartido/dominio/index.js';
import { participante, type Participante } from '../../../dominio/index.js';

// Lee el emisor (AccountingSupplierParty) del XML firmado que escribió GeneradorUblDian (participante-ubl.ts). El
// comprobante muestra al emisor tal como quedó en la factura que aceptó la DIAN, no como está configurado hoy
// (hallazgo H1 de la prueba de ataque de HU-06.08). El XML es nuestro y se guardó al firmar: no trae DTD.

export function emisorDelXml(xml: string): Participante {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('El XML firmado no debe traer DTD');
  const fallar = (): never => {
    throw new Error('El XML firmado no se puede leer');
  };
  const documento = new DOMParser({ errorHandler: { warning: () => undefined, error: fallar, fatalError: fallar } })
    .parseFromString(xml, 'text/xml');
  const proveedor = hijo(documento.documentElement, 'AccountingSupplierParty');
  const parte = hijo(proveedor, 'Party');
  const impuestos = hijo(parte, 'PartyTaxScheme');
  const id = hijo(impuestos, 'CompanyID');
  const direccion = opcional(impuestos, 'RegistrationAddress');
  const correo = opcional(parte, 'Contact');
  return participante({
    identificacion: Identificacion.de(id.getAttribute('schemeName') as TipoDeIdentificacion, texto(id)),
    razonSocial: texto(hijo(impuestos, 'RegistrationName')),
    tipoDePersona: texto(hijo(proveedor, 'AdditionalAccountID')) === '1' ? 'juridica' : 'natural',
    responsabilidadesFiscales: texto(hijo(impuestos, 'TaxLevelCode')).split(';'),
    responsableDeIva: texto(hijo(hijo(impuestos, 'TaxScheme'), 'ID')) === '01',
    direccion: direccion && {
      codigoMunicipio: texto(hijo(direccion, 'ID')),
      ciudad: texto(hijo(direccion, 'CityName')),
      departamento: texto(hijo(direccion, 'CountrySubentity')),
      linea: texto(hijo(hijo(direccion, 'AddressLine'), 'Line')),
    },
    correo: correo && texto(hijo(correo, 'ElectronicMail')),
  });
}

/** El primer hijo directo con ese nombre local (los prefijos cac:/cbc: no importan). */
function opcional(padre: Element, nombre: string): Element | null {
  for (let n = padre.firstChild; n; n = n.nextSibling) {
    if (n.nodeType === 1 && (n as Element).localName === nombre) return n as Element;
  }
  return null;
}

function hijo(padre: Element, nombre: string): Element {
  const encontrado = opcional(padre, nombre);
  if (!encontrado) throw new Error(`El XML firmado no trae ${nombre} del emisor`);
  return encontrado;
}

function texto(e: Element): string {
  return (e.textContent ?? '').trim();
}
