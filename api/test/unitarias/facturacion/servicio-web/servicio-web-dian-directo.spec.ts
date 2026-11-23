import { inflateRawSync } from 'node:zlib';
import { FallaDeComunicacionDian } from '../../../../src/modulos/facturacion/aplicacion/envio/falla-de-comunicacion-dian.js';
import { CertificadoDeFirma } from '../../../../src/modulos/facturacion/aplicacion/firma/certificado-de-firma.js';
import { publicarSobre } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/servicio-web/cliente-http-soap.js';
import { ServicioWebDianDirecto } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/servicio-web/servicio-web-dian-directo.js';
import { CONTRASENA_DE_PRUEBA, juegoDeCertificados } from '../../../recursos/firma/certificados-de-prueba.js';
import { ACUSE_RECIBIDO, FALLA_DE_SEGURIDAD, VALIDACION_RECHAZADA } from './respuestas-grabadas.js';

const juego = juegoDeCertificados();
const acceso = () => ({ certificado: CertificadoDeFirma.de(juego.p12, CONTRASENA_DE_PRUEBA), testSetId: 'set-1' });
const reloj = { ahora: () => new Date('2026-11-23T20:30:00Z') };

function transporte(cuerpo: string, status = 200) {
  const peticiones: { url: string; init: RequestInit }[] = [];
  const enviar = (url: string, init: RequestInit) => {
    peticiones.push({ url, init });
    return Promise.resolve(new Response(cuerpo, { status }));
  };
  return { enviar, peticiones };
}

describe('ServicioWebDianDirecto (HU-02.03)', () => {
  it('envía el set de pruebas: ZIP con el XML, nombre del anexo, testSetId y Content-Type con la acción', async () => {
    const t = transporte(ACUSE_RECIBIDO);
    const servicio = new ServicioWebDianDirecto(reloj, 'https://dian.test/svc', t.enviar);
    const acuse = await servicio.enviarSetDePruebas(
      { xmlFirmado: '<Invoice>ñ</Invoice>', nitEmisor: '900373076', anio: 2026, consecutivo: 1 },
      acceso(),
    );
    expect(acuse).toEqual({ tipo: 'recibido', zipKey: '3f2a6b1c-0000-4000-8000-000000000abc' });
    const [peticion] = t.peticiones;
    const cuerpo = peticion?.init.body as string;
    expect(peticion?.url).toBe('https://dian.test/svc');
    expect((peticion?.init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/soap+xml; charset=utf-8; action="http://wcf.dian.colombia/IWcfDianCustomerServices/SendTestSetAsync"',
    );
    expect(cuerpo).toContain('<wcf:fileName>z09003730760002600000001.zip</wcf:fileName>');
    expect(cuerpo).toContain('<wcf:testSetId>set-1</wcf:testSetId>');
    const zip = Buffer.from(/<wcf:contentFile>([^<]+)</.exec(cuerpo)?.[1] ?? '', 'base64');
    const largoNombre = zip.readUInt16LE(26);
    expect(zip.subarray(30, 30 + largoNombre).toString()).toBe('fv09003730760002600000001.xml');
    expect(inflateRawSync(zip.subarray(30 + largoNombre, 30 + largoNombre + zip.readUInt32LE(18))).toString()).toBe('<Invoice>ñ</Invoice>');
    expect(cuerpo).not.toContain(CONTRASENA_DE_PRUEBA);
  });

  it('consulta la validación y devuelve los rechazos', async () => {
    const servicio = new ServicioWebDianDirecto(reloj, 'https://dian.test/svc', transporte(VALIDACION_RECHAZADA).enviar);
    const r = await servicio.consultarValidacion('zip-1', acceso());
    expect(r.resultado).toBe('rechazado');
    expect(r.mensajes).toHaveLength(2);
  });
});

describe('POST del sobre (HU-02.03)', () => {
  it('un 500 con SOAP Fault se entrega para leerlo; otro error HTTP es falla de comunicación', async () => {
    await expect(publicarSobre('https://dian.test', 'X', '<s/>', transporte(FALLA_DE_SEGURIDAD, 500).enviar)).resolves.toContain('Fault');
    await expect(publicarSobre('https://dian.test', 'X', '<s/>', transporte('Service Unavailable', 503).enviar)).rejects.toThrow(/HTTP 503/);
  });

  it('un error de red o de tiempo es falla de comunicación, sin el detalle del error original', async () => {
    const red = () => Promise.reject(new TypeError('getaddrinfo ENOTFOUND vpfe-hab.dian.gov.co'));
    await expect(publicarSobre('https://dian.test', 'X', '<s/>', red)).rejects.toThrow(new FallaDeComunicacionDian('no se pudo conectar'));
    const tiempo = () => Promise.reject(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));
    await expect(publicarSobre('https://dian.test', 'X', '<s/>', tiempo)).rejects.toThrow(/tiempo de espera agotado/);
  });
});
