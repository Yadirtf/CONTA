import { FallaDeCorreo } from '../../../../src/modulos/facturacion/aplicacion/correo/falla-de-correo.js';
import type { CorreoSaliente } from '../../../../src/modulos/facturacion/aplicacion/puertos/enviador-de-correo.js';
import { configuracionDeCorreoDesde } from '../../../../src/modulos/facturacion/infraestructura/correo/configuracion-de-correo.js';
import { EnviadorBrevo, type Transporte } from '../../../../src/modulos/facturacion/infraestructura/correo/enviador-brevo.js';
import { EnviadorSinConfigurar } from '../../../../src/modulos/facturacion/infraestructura/correo/enviador-sin-configurar.js';

const LLAVE = 'xkeysib-llave-de-prueba';
const correo: CorreoSaliente = {
  para: 'ana@ejemplo.test',
  responderA: 'facturas@ejemplo.test',
  nombreDelRemitente: 'Tienda de Prueba',
  asunto: 'Factura electrónica SETP1 de Tienda de Prueba',
  texto: 'Hola',
  adjuntos: [{ nombre: 'factura-SETP1.pdf', tipo: 'application/pdf', contenido: new Uint8Array([37, 80, 68, 70]) }],
  idempotencia: 'e:v',
};

function con(respuesta: number | Error) {
  const llamadas: { url: string; opciones: RequestInit }[] = [];
  const transporte: Transporte = (url, opciones) => {
    llamadas.push({ url, opciones });
    return respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve({ status: respuesta });
  };
  return { llamadas, enviador: new EnviadorBrevo({ llave: LLAVE, remitente: 'facturas@conta.test' }, transporte) };
}

async function fallaDe(p: Promise<unknown>): Promise<FallaDeCorreo> {
  try {
    await p;
  } catch (e) {
    if (e instanceof FallaDeCorreo) return e;
  }
  throw new Error('no falló con FallaDeCorreo');
}

describe('EnviadorBrevo (HU-06.08)', () => {
  it('manda el correo con la llave en la cabecera, el remitente verificado y los adjuntos en base64', async () => {
    const { llamadas, enviador } = con(201);
    await enviador.enviar(correo);
    const [llamada] = llamadas;
    expect(llamada?.url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((llamada?.opciones.headers as Record<string, string>)['api-key']).toBe(LLAVE);
    const cuerpo = JSON.parse(llamada?.opciones.body as string) as Record<string, unknown>;
    expect(cuerpo).toMatchObject({
      sender: { name: 'Tienda de Prueba', email: 'facturas@conta.test' },
      to: [{ email: 'ana@ejemplo.test' }],
      replyTo: { email: 'facturas@ejemplo.test' },
      attachment: [{ name: 'factura-SETP1.pdf', content: 'JVBERg==' }],
    });
    expect(JSON.stringify(cuerpo)).not.toContain(LLAVE);
  });

  it('un 400 es permanente; 401, 429, 5xx y la red se reintentan; nunca guarda el cuerpo ni la llave', async () => {
    expect(await fallaDe(con(400).enviador.enviar(correo))).toMatchObject({ codigo: 'correo.http-400', permanente: true });
    for (const estado of [401, 429, 503]) {
      expect(await fallaDe(con(estado).enviador.enviar(correo))).toMatchObject({ codigo: `correo.http-${estado}`, permanente: false });
    }
    const red = await fallaDe(con(new Error(`timeout ${LLAVE}`)).enviador.enviar(correo));
    expect(red).toMatchObject({ codigo: 'correo.sin-respuesta', permanente: false });
    expect(red.message).not.toContain(LLAVE);
  });

  it('sin llave ni remitente válido no hay proveedor, y cada intento espera la configuración', async () => {
    expect(configuracionDeCorreoDesde({})).toBeNull();
    expect(configuracionDeCorreoDesde({ CORREO_BREVO_LLAVE: LLAVE, CORREO_REMITENTE: 'no-es-correo' })).toBeNull();
    expect(configuracionDeCorreoDesde({ CORREO_BREVO_LLAVE: LLAVE, CORREO_REMITENTE: 'f@conta.test' })).toEqual({ llave: LLAVE, remitente: 'f@conta.test' });
    expect(await fallaDe(new EnviadorSinConfigurar().enviar())).toMatchObject({ codigo: 'correo.sin-configurar', permanente: false });
  });
});
