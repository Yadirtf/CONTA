import { CerrarSesion } from '../../../src/modulos/identidad/aplicacion/comandos/cerrar-sesion.js';
import { SolicitarCodigo } from '../../../src/modulos/identidad/aplicacion/comandos/solicitar-codigo.js';
import { VerificarCodigo } from '../../../src/modulos/identidad/aplicacion/comandos/verificar-codigo.js';
import { SesionDelToken } from '../../../src/modulos/identidad/aplicacion/consultas/sesion-del-token.js';
import { FallaDeEnvio } from '../../../src/modulos/identidad/aplicacion/puertos/enviador-de-codigos.js';
import { ErrorDeAcceso } from '../../../src/modulos/identidad/dominio/index.js';
import { GeneradorDeCodigosNode } from '../../../src/modulos/identidad/infraestructura/cripto/generador-de-codigos-node.js';
import { EnviadorEspia, huellas, IdentidadEnMemoria, RelojFijo } from './dobles.js';

const CELULAR = '300 123 4567';

function armar() {
  const base = new IdentidadEnMemoria();
  const enviador = new EnviadorEspia();
  const reloj = new RelojFijo(new Date('2026-11-23T15:00:00Z'));
  const h = huellas();
  return {
    base,
    enviador,
    reloj,
    solicitar: new SolicitarCodigo(base, new GeneradorDeCodigosNode(), h, enviador, reloj),
    verificar: new VerificarCodigo(base, h, reloj),
    sesionDelToken: new SesionDelToken(base, h, reloj),
    cerrar: new CerrarSesion(base, reloj),
  };
}

const rechazo = async (promesa: Promise<unknown>) => {
  const error = await promesa.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeAcceso);
  return error as ErrorDeAcceso;
};

describe('Entrar con celular y código (HU-04.01)', () => {
  it('envía un código de 6 dígitos y no guarda el código en claro', async () => {
    const { solicitar, enviador, base } = armar();
    const { venceEn } = await solicitar.ejecutar(CELULAR);
    expect(enviador.enviados).toHaveLength(1);
    expect(enviador.enviados[0]?.codigo).toMatch(/^\d{6}$/);
    expect(venceEn.toISOString()).toBe('2026-11-23T15:10:00.000Z');
    const guardado = JSON.stringify(base.accesos.get('+573001234567')?.foto);
    expect(guardado).not.toContain(enviador.enviados[0]?.codigo);
  });

  it('la primera vez registra a la persona y abre una sesión; la segunda la reconoce', async () => {
    const { solicitar, verificar, enviador, reloj, sesionDelToken } = armar();
    await solicitar.ejecutar(CELULAR);
    const primera = await verificar.ejecutar(CELULAR, enviador.enviados[0]!.codigo);
    expect(primera.nuevo).toBe(true);
    expect((await sesionDelToken.ejecutar(primera.token))?.usuario.id.valor).toBe(primera.usuario.id.valor);

    reloj.avanzar(2 * 60_000);
    await solicitar.ejecutar(CELULAR);
    const segunda = await verificar.ejecutar(CELULAR, enviador.enviados[1]!.codigo);
    expect(segunda.nuevo).toBe(false);
    expect(segunda.usuario.id.valor).toBe(primera.usuario.id.valor);
  });

  it('un fallo se guarda aunque la verificación se rechace, y al quinto bloquea', async () => {
    const { solicitar, verificar, base } = armar();
    await solicitar.ejecutar(CELULAR);
    for (let i = 4; i >= 1; i--) {
      expect((await rechazo(verificar.ejecutar(CELULAR, '000000'))).detalle.intentosRestantes).toBe(i);
    }
    expect((await rechazo(verificar.ejecutar(CELULAR, '000000'))).codigo).toBe('acceso.bloqueado');
    expect(base.accesos.get('+573001234567')?.foto.bloqueadoHasta).not.toBeNull();
  });

  it('si el canal falla responde envio-fallido y el código igual cuenta para los límites', async () => {
    const { solicitar, enviador } = armar();
    enviador.falla = new FallaDeEnvio('WhatsApp respondió 500');
    expect((await rechazo(solicitar.ejecutar(CELULAR))).codigo).toBe('acceso.envio-fallido');
    enviador.falla = null;
    expect((await rechazo(solicitar.ejecutar(CELULAR))).codigo).toBe('acceso.espera');
  });

  it('cerrar sesión deja el token sin efecto', async () => {
    const { solicitar, verificar, enviador, sesionDelToken, cerrar } = armar();
    await solicitar.ejecutar(CELULAR);
    const { token } = await verificar.ejecutar(CELULAR, enviador.enviados[0]!.codigo);
    const vigente = await sesionDelToken.ejecutar(token);
    await cerrar.ejecutar(vigente!.sesion.id);
    expect(await sesionDelToken.ejecutar(token)).toBeNull();
  });

  it('un token con otra forma ni se busca', async () => {
    expect(await armar().sesionDelToken.ejecutar('corto')).toBeNull();
  });

  it('la sesión vence a los 30 días', async () => {
    const { solicitar, verificar, enviador, sesionDelToken, reloj } = armar();
    await solicitar.ejecutar(CELULAR);
    const { token } = await verificar.ejecutar(CELULAR, enviador.enviados[0]!.codigo);
    reloj.avanzar(30 * 24 * 3600 * 1000);
    expect(await sesionDelToken.ejecutar(token)).toBeNull();
  });
});
