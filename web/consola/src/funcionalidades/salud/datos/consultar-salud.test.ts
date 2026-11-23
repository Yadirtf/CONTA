import { describe, expect, it } from 'vitest';
import { consultarSalud } from './consultar-salud';

const responder = (cuerpo: unknown, estado = 200) => async () =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'content-type': 'application/json' } });

describe('consultarSalud', () => {
  it('sin URL no llama a la red', async () => {
    const pedir = async () => {
      throw new Error('no debía llamar');
    };
    expect(await consultarSalud(undefined, pedir)).toEqual({ tipo: 'sin-configurar' });
  });

  it('reporta la versión cuando /salud responde ok', async () => {
    const estado = await consultarSalud('https://conta-api-develop.onrender.com', responder({ estado: 'ok', version: '0.1.0' }));
    expect(estado).toEqual({ tipo: 'viva', version: '0.1.0' });
  });

  it('trata un error HTTP como sin respuesta', async () => {
    expect(await consultarSalud('https://x.test', responder({}, 502))).toEqual({ tipo: 'sin-respuesta' });
  });

  it('trata un tiempo agotado como sin respuesta', async () => {
    const lento: typeof fetch = (_url, init) =>
      new Promise((_resolver, rechazar) => init?.signal?.addEventListener('abort', () => rechazar(new Error('abortado'))));
    expect(await consultarSalud('https://x.test', lento, 10)).toEqual({ tipo: 'sin-respuesta' });
  });
});
