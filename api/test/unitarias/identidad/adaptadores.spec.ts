import { FallaDeEnvio } from '../../../src/modulos/identidad/aplicacion/puertos/enviador-de-codigos.js';
import { Celular } from '../../../src/modulos/identidad/dominio/index.js';
import { configuracionDeAcceso } from '../../../src/modulos/identidad/infraestructura/configuracion/configuracion-de-acceso.js';
import { HuellasNode } from '../../../src/modulos/identidad/infraestructura/cripto/huellas-node.js';
import { GeneradorDeCodigosNode } from '../../../src/modulos/identidad/infraestructura/cripto/generador-de-codigos-node.js';
import { EnviadorConCelularesDePrueba } from '../../../src/modulos/identidad/infraestructura/envio/enviador-con-celulares-de-prueba.js';
import { EnviadorConTope } from '../../../src/modulos/identidad/infraestructura/envio/enviador-con-tope.js';
import { EnviadorWhatsAppCloud } from '../../../src/modulos/identidad/infraestructura/envio/enviador-whatsapp-cloud.js';
import { LimitadorPorVentana } from '../../../src/compartido/presentacion/limites/limitador-por-ventana.js';
import { EnviadorEspia, huellas } from './dobles.js';

const celular = Celular.de('3001234567');
const SECRETO = 'x'.repeat(32);

describe('configuración del acceso (HU-04.01)', () => {
  it('celulares de prueba solo con CONTA_ENTORNO=pruebas: si no, la API no arranca', () => {
    expect(() => configuracionDeAcceso({ CELULARES_DE_PRUEBA: '3000000001:123456' })).toThrow(/puerta trasera/);
    const config = configuracionDeAcceso({ CELULARES_DE_PRUEBA: '300 000 0001:123456', CONTA_ENTORNO: 'pruebas' });
    expect(config.celularesDePrueba.get('+573000000001')).toBe('123456');
  });

  it('rechaza un secreto corto y un código de prueba que no tiene 6 dígitos', () => {
    expect(() => configuracionDeAcceso({ SECRETO_CODIGOS_ACCESO: 'corto' })).toThrow(/32/);
    expect(() => configuracionDeAcceso({ CELULARES_DE_PRUEBA: '3000000001:12', CONTA_ENTORNO: 'pruebas' })).toThrow(/6 dígitos/);
  });

  it('la clave del segundo factor también exige 32 caracteres; sin ella queda en null (falla cerrado, HU-04.04)', () => {
    expect(() => configuracionDeAcceso({ SECRETO_SEGUNDO_FACTOR: 'corto' })).toThrow(/SECRETO_SEGUNDO_FACTOR.*32/);
    expect(configuracionDeAcceso({}).secretoDeSegundoFactor).toBeNull();
    expect(configuracionDeAcceso({ SECRETO_SEGUNDO_FACTOR: 'x'.repeat(32) }).secretoDeSegundoFactor).toBe('x'.repeat(32));
  });

  it('sin credenciales de WhatsApp no hay canal', () => {
    expect(configuracionDeAcceso({}).whatsapp).toBeNull();
    expect(configuracionDeAcceso({ WHATSAPP_TOKEN: 't', WHATSAPP_ID_NUMERO: '123' }).whatsapp?.plantilla).toBe('codigo_de_acceso');
  });
});

describe('huellas y códigos', () => {
  it('la huella del código depende del celular y del secreto, y compara bien', () => {
    const h = huellas();
    const huella = h.huellaDeCodigo(celular, '123456');
    expect(huella).toMatch(/^[0-9a-f]{64}$/);
    expect(h.coincideCodigo(celular, '123456', huella)).toBe(true);
    expect(h.coincideCodigo(celular, '123457', huella)).toBe(false);
    expect(h.coincideCodigo(Celular.de('3001234568'), '123456', huella)).toBe(false);
    expect(new HuellasNode(SECRETO).huellaDeCodigo(celular, '123456')).not.toBe(huella);
  });

  it('el token es de 43 caracteres base64url y su huella es SHA-256', () => {
    const h = huellas();
    const token = h.nuevoToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(h.huellaDeToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('el generador da 6 dígitos, y el fijo solo a los celulares de prueba', () => {
    const generador = new GeneradorDeCodigosNode(new Map([['+573000000001', '111111']]));
    expect(generador.nuevo(Celular.de('3000000001'))).toBe('111111');
    expect(generador.nuevo(celular)).toMatch(/^\d{6}$/);
  });
});

describe('enviadores', () => {
  it('WhatsApp manda la plantilla de autenticación con el código en el cuerpo y en el botón', async () => {
    const pedidos: { url: string; init: RequestInit }[] = [];
    const enviador = new EnviadorWhatsAppCloud(
      { token: 'tok', idDelNumero: '42', plantilla: 'codigo_de_acceso', idioma: 'es' },
      (url, init) => {
        pedidos.push({ url, init });
        return Promise.resolve(new Response('{"messages":[{"id":"wamid.1"}]}', { status: 200 }));
      },
    );
    await enviador.enviar(celular, '482913');
    expect(pedidos[0]?.url).toBe('https://graph.facebook.com/v23.0/42/messages');
    const cuerpo = JSON.parse(pedidos[0]?.init.body as string) as { to: string; template: { components: { parameters: { text: string }[] }[] } };
    expect(cuerpo.to).toBe('573001234567');
    expect(cuerpo.template.components.map((c) => c.parameters[0]?.text)).toEqual(['482913', '482913']);
  });

  it('si WhatsApp responde error, la falla y el registro traen el estado y el código de Meta, nunca el código de acceso', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const enviador = new EnviadorWhatsAppCloud(
      { token: 'tok', idDelNumero: '42', plantilla: 'p', idioma: 'es' },
      () => Promise.resolve(new Response('{"error":{"code":131030,"message":"482913"}}', { status: 400 })),
    );
    const error = await enviador.enviar(celular, '482913').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(FallaDeEnvio);
    expect((error as Error).message).toBe('WhatsApp respondió 400 (código 131030)');
    const registro = String(aviso.mock.calls[0]?.[0]);
    expect(registro).toContain('+57 300 *** 4567');
    expect(registro).not.toContain('482913');
    aviso.mockRestore();
  });

  it('cuando Meta acepta, registra el id del mensaje para rastrear la entrega', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const enviador = new EnviadorWhatsAppCloud(
      { token: 'tok', idDelNumero: '42', plantilla: 'p', idioma: 'es' },
      () => Promise.resolve(new Response('{"messages":[{"id":"wamid.HBgM=="}]}', { status: 200 })),
    );
    await enviador.enviar(celular, '482913');
    expect(String(aviso.mock.calls[0]?.[0])).toBe('Acceso: WhatsApp aceptó el mensaje wamid.HBgM== (+57 300 *** 4567)');
    aviso.mockRestore();
  });

  it('a los celulares de prueba no se les envía nada', async () => {
    const real = new EnviadorEspia();
    const enviador = new EnviadorConCelularesDePrueba(new Map([['+573000000001', '111111']]), real);
    await enviador.enviar(Celular.de('3000000001'), '111111');
    await enviador.enviar(celular, '222222');
    expect(real.enviados.map((e) => e.celular)).toEqual(['+573001234567']);
  });

  it('el tope por hora corta los envíos y se reinicia en la hora siguiente', async () => {
    let ahora = 0;
    const real = new EnviadorEspia();
    const enviador = new EnviadorConTope(real, 2, () => ahora);
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await enviador.enviar(celular, '1');
    await enviador.enviar(celular, '2');
    await expect(enviador.enviar(celular, '3')).rejects.toBeInstanceOf(FallaDeEnvio);
    expect(String(aviso.mock.calls[0]?.[0])).not.toContain('300');
    ahora = 3_600_000;
    await enviador.enviar(celular, '4');
    expect(real.enviados).toHaveLength(3);
    aviso.mockRestore();
  });
});

describe('LimitadorPorVentana', () => {
  it('admite hasta el máximo por origen y vuelve a admitir en la ventana siguiente', () => {
    let ahora = 0;
    const limitador = new LimitadorPorVentana(2, 1000, () => ahora);
    expect([limitador.admitir('a'), limitador.admitir('a'), limitador.admitir('a'), limitador.admitir('b')]).toEqual([true, true, false, true]);
    ahora = 1000;
    expect(limitador.admitir('a')).toBe(true);
  });
});
