import { leerPkcs12 } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/firma/lector-pkcs12.js';
import { firmarSobre } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/servicio-web/firma-ws-security.js';
import { cuerpoGetStatusZip } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/servicio-web/operaciones-dian.js';
import { sobreSinFirmar } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/servicio-web/sobre-soap.js';
import { CONTRASENA_DE_PRUEBA, juegoDeCertificados } from '../../../recursos/firma/certificados-de-prueba.js';
import { exigirXmlsec, hayXmlsec, verificarSobreConXmlsec } from '../../../recursos/firma/verificador-xmlsec.js';

const juego = juegoDeCertificados();
const material = leerPkcs12(juego.p12, CONTRASENA_DE_PRUEBA);
const DESTINO = 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc';
const AHORA = new Date('2026-11-23T20:30:00.000Z');
const sobre = firmarSobre(
  sobreSinFirmar({
    operacion: 'GetStatusZip',
    destino: DESTINO,
    cuerpo: cuerpoGetStatusZip('zip-1'),
    certificadoDer: material.certificado.raw,
    ahora: AHORA,
    idDelMensaje: '00000000-0000-4000-8000-000000000001',
  }),
  material.llave,
);

describe('sobre SOAP con WS-Security para la DIAN (HU-02.03)', () => {
  it.runIf(hayXmlsec || exigirXmlsec)('la firma valida con xmlsec1 (C14N exclusivo con wsa, soap y wcf incluidos)', () => {
    const r = verificarSobreConXmlsec(sobre, juego.caPem);
    expect(r.salida).toContain('OK');
    expect(r.valida).toBe(true);
  });

  it.runIf(hayXmlsec || exigirXmlsec)('xmlsec1 la rechaza si se cambia el destino firmado', () => {
    expect(verificarSobreConXmlsec(sobre.replace(`>${DESTINO}<`, '>https://otro.test/<'), juego.caPem).valida).toBe(false);
  });

  it('firma solo wsa:To y apunta al BinarySecurityToken', () => {
    expect(sobre.match(/<ds:Reference /g)).toHaveLength(1);
    expect(sobre).toContain('<ds:Reference URI="#id-destino">');
    expect(sobre).toContain('<wsse:Reference URI="#id-token-x509"');
    expect(sobre).toContain('PrefixList="wsa soap wcf"');
    expect(sobre).toContain('Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"');
    expect(sobre).toContain('Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"');
  });

  it('dentro de wsse:Security va Timestamp, luego el token y luego la firma', () => {
    const posicion = (t: string) => sobre.indexOf(t);
    expect(posicion('<wsu:Timestamp')).toBeLessThan(posicion('<wsse:BinarySecurityToken'));
    expect(posicion('<wsse:BinarySecurityToken')).toBeLessThan(posicion('<ds:Signature'));
    expect(posicion('</ds:Signature>')).toBeLessThan(posicion('</wsse:Security>'));
  });

  it('el sello de tiempo vence a los 5 minutos y la acción es la de la operación', () => {
    expect(sobre).toContain('<wsu:Created>2026-11-23T20:30:00.000Z</wsu:Created><wsu:Expires>2026-11-23T20:35:00.000Z</wsu:Expires>');
    expect(sobre).toContain('>http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatusZip</wsa:Action>');
    expect(sobre).toContain('<wcf:GetStatusZip><wcf:trackId>zip-1</wcf:trackId></wcf:GetStatusZip>');
  });

  it('cada elemento con wsu:Id declara xmlns:wsu en sí mismo', () => {
    for (const m of sobre.matchAll(/<[^>]* wsu:Id="[^"]+"[^>]*>/g)) expect(m[0]).toContain('xmlns:wsu=');
  });
});
