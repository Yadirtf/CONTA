import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { DocumentoNoFirmable } from '../../../aplicacion/firma/errores-de-firma.js';
import { ESPACIOS_DE_NOMBRES } from '../ubl/constantes-dian.js';
import { ESPACIO_XMLDSIG } from './politica-de-firma.js';

// Revisa que el XML sea una sola factura UBL sin firmar y le agrega la segunda ext:UBLExtension vacía
// donde va la firma (anexo 10.1). Rechaza DTD y entidades: así nadie puede esconder contenido que el
// verificador lea distinto, ni hacer que el analizador lea archivos o expanda entidades sin fin.

const UBL = ESPACIOS_DE_NOMBRES.xmlns;
const EXT = ESPACIOS_DE_NOMBRES['xmlns:ext'];

/** XPath, sin prefijos, del ExtensionContent donde se inserta la firma. */
export const UBICACION_DE_LA_FIRMA =
  `/*[local-name()='Invoice' and namespace-uri()='${UBL}']` +
  `/*[local-name()='UBLExtensions' and namespace-uri()='${EXT}']` +
  `/*[local-name()='UBLExtension'][last()]/*[local-name()='ExtensionContent']`;

export function documentoPorFirmar(xml: string): string {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new DocumentoNoFirmable('no se admiten DTD ni entidades');
  const documento = analizar(xml);
  const raiz = documento.documentElement;
  if (!raiz || raiz.localName !== 'Invoice' || raiz.namespaceURI !== UBL) {
    throw new DocumentoNoFirmable('la raíz no es una factura UBL 2.1');
  }
  if (documento.getElementsByTagNameNS(UBL, 'Invoice').length !== 1) {
    throw new DocumentoNoFirmable('contiene más de una factura');
  }
  if (documento.getElementsByTagNameNS(ESPACIO_XMLDSIG, 'Signature').length > 0) {
    throw new DocumentoNoFirmable('ya está firmado');
  }
  const extensiones = hijos(raiz, EXT, 'UBLExtensions');
  if (extensiones.length !== 1 || hijos(extensiones[0]!, EXT, 'UBLExtension').length !== 1) {
    throw new DocumentoNoFirmable('debe traer exactamente una ext:UBLExtension, la de la DIAN');
  }
  const extension = documento.createElementNS(EXT, 'ext:UBLExtension');
  extension.appendChild(documento.createElementNS(EXT, 'ext:ExtensionContent'));
  extensiones[0]!.appendChild(extension);
  return new XMLSerializer().serializeToString(documento);
}

function analizar(xml: string): Document {
  const fallar = (): never => {
    throw new DocumentoNoFirmable('no es XML bien formado');
  };
  return new DOMParser({
    errorHandler: {
      warning: () => undefined,
      error: fallar,
      fatalError: fallar,
    },
  }).parseFromString(xml, 'text/xml');
}

function hijos(padre: Element, espacio: string, nombre: string): Element[] {
  return Array.from(padre.childNodes).filter(
    (n): n is Element =>
      n.nodeType === 1 && (n as Element).localName === nombre && (n as Element).namespaceURI === espacio,
  );
}
