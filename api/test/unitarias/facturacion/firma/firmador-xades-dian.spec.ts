import { X509Certificate, createHash } from 'node:crypto';
import { erroresContraUblInvoice, erroresDeLaFirma } from '../../../recursos/dian/validador-xsd.js';
import { exigirXmlsec, hayXmlsec, verificarConXmlsec } from '../../../recursos/firma/verificador-xmlsec.js';
import { AHORA, certificadoDe, facturaSinFirmar, firmador, juegoDeCertificados } from './apoyo.js';

const juego = juegoDeCertificados();
const documento = facturaSinFirmar();
const xml = firmador().firmar(documento.xml, certificadoDe(juego));

function texto(nombre: string): string {
  const m = new RegExp(`<${nombre}(?: [^>]*)?>([^<]*)</${nombre}>`).exec(xml);
  if (!m?.[1]) throw new Error(`No está ${nombre}`);
  return m[1];
}

describe('firma XAdES-EPES de la factura (HU-02.02)', () => {
  it.runIf(hayXmlsec || exigirXmlsec)(
    'valida con un verificador externo (xmlsec1) que confía en la CA de prueba',
    () => {
      const resultado = verificarConXmlsec(xml, juego.caPem);
      expect(resultado.salida).toContain('OK');
      expect(resultado.valida).toBe(true);
    },
  );

  it.runIf(hayXmlsec || exigirXmlsec)(
    'el verificador externo rechaza la factura si se cambia un valor después de firmar',
    () => {
      const alterada = xml.replace(/(<cbc:PayableAmount currencyID="COP">)[^<]*/, '$11.00');
      expect(alterada).not.toBe(xml);
      expect(verificarConXmlsec(alterada, juego.caPem).valida).toBe(false);
    },
  );

  it('el documento firmado sigue validando contra UBL-Invoice-2.1.xsd', async () => {
    expect(await erroresContraUblInvoice(xml)).toEqual([]);
  });

  it('la ds:Signature y sus propiedades XAdES validan contra los esquemas XMLDSig y XAdES 1.3.2', async () => {
    expect(await erroresDeLaFirma(xml)).toEqual([]);
  });

  it('va en la segunda ext:UBLExtension y deja intacto el resto del documento y el CUFE', () => {
    expect(xml).toContain('</ext:UBLExtension><ext:UBLExtension><ext:ExtensionContent><ds:Signature ');
    expect(xml.match(/<ds:Signature /g)).toHaveLength(1);
    const sinFirma = xml.replace(
      /<ext:UBLExtension><ext:ExtensionContent><ds:Signature .*<\/ds:Signature><\/ext:ExtensionContent><\/ext:UBLExtension>/,
      '',
    );
    expect(sinFirma).toBe(documento.xml);
    expect(texto('cbc:UUID')).toBe(documento.cufe);
  });

  it('declara los algoritmos y las tres referencias del anexo, en orden', () => {
    expect(xml).toContain('<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>');
    expect(xml).toContain('<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>');
    const referencias = [...xml.matchAll(/<ds:Reference URI="([^"]*)"/g)].map((m) => m[1]);
    expect(referencias).toEqual(['', expect.stringMatching(/-keyinfo$/), expect.stringMatching(/-signedprops$/)]);
    expect(xml).toMatch(
      /<ds:Reference URI="" Id="([^"]+)"><ds:Transforms><ds:Transform Algorithm="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#enveloped-signature"\/>/,
    );
    expect(xml).toContain('Type="http://uri.etsi.org/01903#SignedProperties"');
  });

  it('identifica el certificado firmante, la política de la DIAN, el rol y la hora de Colombia', () => {
    const certificado = new X509Certificate(juego.certificadoPem);
    expect(texto('xades:SigningTime')).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d-05:00$/);
    expect(new Date(texto('xades:SigningTime')).getTime()).toBe(Math.floor(AHORA.getTime() / 1000) * 1000);
    expect(xml).toContain(
      `<ds:DigestValue>${createHash('sha256').update(certificado.raw).digest('base64')}</ds:DigestValue>`,
    );
    expect(texto('ds:X509SerialNumber')).toBe(BigInt('0x0a1b2c3d4e5f').toString());
    expect(texto('ds:X509IssuerName')).toBe('CN=CA de Prueba CONTA,O=Entidad Certificadora de Prueba\\, S.A.,C=CO');
    expect(texto('xades:Identifier')).toBe(
      'https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf',
    );
    expect(xml).toContain('<ds:DigestValue>dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=</ds:DigestValue>');
    expect(texto('xades:ClaimedRole')).toBe('supplier');
    const ref0 = /<ds:Reference URI="" Id="([^"]+)"/.exec(xml)?.[1];
    expect(xml).toContain(`<xades:DataObjectFormat ObjectReference="#${ref0}">`);
  });

  it('pone en KeyInfo el certificado firmante primero y luego la cadena', () => {
    const certificados = [...xml.matchAll(/<ds:X509Certificate>([^<]+)<\/ds:X509Certificate>/g)].map((m) => m[1]);
    expect(certificados).toHaveLength(2);
    expect(certificados[0]).toBe(new X509Certificate(juego.certificadoPem).raw.toString('base64'));
    expect(certificados[1]).toBe(new X509Certificate(juego.caPem).raw.toString('base64'));
  });

  it('cada firma lleva sus propios Id', () => {
    const otra = firmador().firmar(documento.xml, certificadoDe(juego));
    const id = (x: string) => /<ds:Signature Id="([^"]+)"/.exec(x)?.[1];
    expect(id(otra)).not.toBe(id(xml));
  });

  it('acepta un .p12 cifrado con AES-256 además de 3DES', () => {
    const aes = juegoDeCertificados({ cifrado: 'aes256' });
    expect(firmador().firmar(documento.xml, certificadoDe(aes))).toContain('<ds:SignatureValue>');
  });
});
