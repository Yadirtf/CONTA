import { DocumentoNoFirmable } from '../../../../src/modulos/facturacion/aplicacion/firma/errores-de-firma.js';
import { certificadoDe, facturaSinFirmar, firmador, juegoDeCertificados } from './apoyo.js';

// El firmador solo firma una factura UBL generada por CONTA: una sola raíz Invoice, una sola extensión
// (la de la DIAN), sin firma previa y sin DTD. Cualquier otra cosa se rechaza antes de tocar la llave.

const juego = juegoDeCertificados();
const { xml } = facturaSinFirmar();
const firmar = (documento: string) => () => firmador().firmar(documento, certificadoDe(juego));

describe('documentos que el firmador rechaza (HU-02.02)', () => {
  it('rechaza un documento con DTD o entidades', () => {
    const conDtd = xml.replace('<Invoice ', '<!DOCTYPE Invoice [<!ENTITY x SYSTEM "file:///etc/passwd">]><Invoice ');
    expect(firmar(conDtd)).toThrow(DocumentoNoFirmable);
  });

  it('rechaza XML mal formado', () => {
    expect(firmar(xml.slice(0, -5))).toThrow(DocumentoNoFirmable);
  });

  it('rechaza un documento que no es una factura UBL', () => {
    expect(firmar('<?xml version="1.0"?><Otro xmlns="urn:x"/>')).toThrow(/no es una factura UBL/);
  });

  it('rechaza un documento ya firmado (no se firma dos veces)', () => {
    const firmado = firmador().firmar(xml, certificadoDe(juego));
    expect(firmar(firmado)).toThrow(/ya está firmado/);
  });

  it('rechaza una factura escondida dentro de otra', () => {
    const anidada = xml.replace(
      '<cbc:UBLVersionID>',
      '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"/><cbc:UBLVersionID>',
    );
    expect(firmar(anidada)).toThrow(/más de una factura/);
  });

  it('rechaza extensiones de más o de menos', () => {
    const sinExtensiones = xml.replace(/<ext:UBLExtensions>.*<\/ext:UBLExtensions>/, '');
    expect(firmar(sinExtensiones)).toThrow(/exactamente una ext:UBLExtension/);
    const dosExtensiones = xml.replace(
      '</ext:UBLExtensions>',
      '<ext:UBLExtension><ext:ExtensionContent><x xmlns="urn:x"/></ext:ExtensionContent></ext:UBLExtension></ext:UBLExtensions>',
    );
    expect(firmar(dosExtensiones)).toThrow(/exactamente una ext:UBLExtension/);
  });
});
