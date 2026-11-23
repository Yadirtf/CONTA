import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateXML, type XMLFileInfo } from 'xmllint-wasm';

// Valida documentos contra los esquemas XSD oficiales (copias en ./xsd, ver ./README.md). Solo para pruebas.
const carpeta = fileURLToPath(new URL('./xsd/', import.meta.url));
const leer = (ruta: string): XMLFileInfo => ({ fileName: ruta, contents: readFileSync(`${carpeta}${ruta}`, 'utf8') });
const comunes = readdirSync(`${carpeta}common`).map((f) => leer(`common/${f}`));

async function validar(xml: string, esquema: string, otros: string[]): Promise<string[]> {
  const resultado = await validateXML({
    xml: [{ fileName: 'documento.xml', contents: xml }],
    schema: [leer(esquema)],
    preload: [...comunes, ...otros.map(leer)],
  });
  return resultado.errors.map((e) => e.rawMessage);
}

/** Errores del documento contra UBL-Invoice-2.1.xsd (las extensiones de la DIAN se revisan aparte). */
export function erroresContraUblInvoice(xml: string): Promise<string[]> {
  return validar(xml, 'maindoc/UBL-Invoice-2.1.xsd', ['maindoc/DIAN_UBL_Structures.xsd']);
}

/** Errores de sts:DianExtensions contra DIAN_UBL_Structures.xsd, extraída del documento. */
export function erroresDeExtensionesDian(xml: string): Promise<string[]> {
  const inicio = xml.indexOf('<sts:DianExtensions>');
  const fin = xml.indexOf('</sts:DianExtensions>') + '</sts:DianExtensions>'.length;
  if (inicio < 0 || fin < inicio) return Promise.resolve(['No hay sts:DianExtensions']);
  const declaraciones = [...xml.matchAll(/ xmlns:(sts|cbc|cac)="[^"]*"/g)].map((m) => m[0]).join('');
  const extensiones = xml.slice(inicio, fin).replace('<sts:DianExtensions>', `<sts:DianExtensions${declaraciones}>`);
  return validar(extensiones, 'maindoc/DIAN_UBL_Structures.xsd', []);
}

/** Errores de la ds:Signature (con sus propiedades XAdES 1.3.2) contra los esquemas XMLDSig y XAdES de UBL 2.1. */
export function erroresDeLaFirma(xml: string): Promise<string[]> {
  const inicio = xml.indexOf('<ds:Signature ');
  const fin = xml.indexOf('</ds:Signature>') + '</ds:Signature>'.length;
  if (inicio < 0 || fin < inicio) return Promise.resolve(['No hay ds:Signature']);
  return validar(xml.slice(inicio, fin), 'common/UBL-XAdESv132-2.1.xsd', []);
}
