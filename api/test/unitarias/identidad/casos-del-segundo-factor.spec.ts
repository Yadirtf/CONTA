import { ConfirmarInscripcion } from '../../../src/modulos/identidad/aplicacion/comandos/segundo-factor/confirmar-inscripcion.js';
import { IniciarInscripcion } from '../../../src/modulos/identidad/aplicacion/comandos/segundo-factor/iniciar-inscripcion.js';
import { VerificarSegundoFactor } from '../../../src/modulos/identidad/aplicacion/comandos/segundo-factor/verificar-segundo-factor.js';
import { ConsultarSegundoFactor } from '../../../src/modulos/identidad/aplicacion/consultas/estado-del-segundo-factor.js';
import { SesionDelToken } from '../../../src/modulos/identidad/aplicacion/consultas/sesion-del-token.js';
import type { SesionVigente } from '../../../src/modulos/identidad/aplicacion/puertos/repositorios-de-identidad.js';
import type { SecretosDeSegundoFactor } from '../../../src/modulos/identidad/aplicacion/puertos/secretos-de-segundo-factor.js';
import {
  abrirSesion,
  Celular,
  ErrorDeSegundoFactor,
  IdUsuario,
  POLITICA_DE_SEGUNDO_FACTOR as P,
} from '../../../src/modulos/identidad/dominio/index.js';
import { SecretosDeSegundoFactorNode } from '../../../src/modulos/identidad/infraestructura/segundo-factor/secretos-de-segundo-factor-node.js';
import { SecretosSinClave } from '../../../src/modulos/identidad/infraestructura/segundo-factor/secretos-sin-clave.js';
import { codigoDeLaApp } from '../../apoyo/app-autenticadora.js';
import { huellas, IdentidadEnMemoria, RelojFijo } from './dobles.js';

// Casos de uso del segundo factor (HU-04.04, ADR-0013) con la base en memoria y la criptografía real.

const MINUTO = 60_000;
const PERSONA = IdUsuario.de('66666666-6666-4666-8666-666666666666');

function armar(secretos: SecretosDeSegundoFactor = new SecretosDeSegundoFactorNode('z'.repeat(32))) {
  const base = new IdentidadEnMemoria();
  const reloj = new RelojFijo(new Date('2026-11-26T15:00:00Z'));
  const h = huellas();
  const usuario = { id: PERSONA, celular: Celular.de('3001234567'), creadoEn: reloj.ahora() };
  base.usuarios.set(usuario.celular.e164, usuario);

  /** Abre una sesión en el dispositivo y devuelve su token. */
  const abrir = (id: string) => {
    const token = h.nuevoToken();
    base.sesiones.set(id, { sesion: abrirSesion(id, PERSONA, reloj.ahora()), huella: h.huellaDeToken(token), revocadaEn: null });
    return token;
  };
  const sesionDelToken = new SesionDelToken(base, h, reloj);
  /** La sesión tal como la vería la siguiente petición. */
  const leer = async (token: string): Promise<SesionVigente> => (await sesionDelToken.ejecutar(token))!;

  return {
    base,
    reloj,
    abrir,
    leer,
    sesionDelToken,
    iniciar: new IniciarInscripcion(base, secretos, h, reloj),
    confirmar: new ConfirmarInscripcion(base, secretos, h, reloj),
    verificar: new VerificarSegundoFactor(base, secretos, h, reloj),
    consultar: new ConsultarSegundoFactor(base, reloj),
  };
}

const rechazo = async (promesa: Promise<unknown>) => {
  const error = await promesa.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ErrorDeSegundoFactor);
  return error as ErrorDeSegundoFactor;
};

/** Inscribe la app en la sesión del token y devuelve su clave y los códigos de recuperación. */
async function inscribir(c: ReturnType<typeof armar>, token: string) {
  const { secreto } = await c.iniciar.ejecutar(await c.leer(token));
  const { codigosDeRecuperacion } = await c.confirmar.ejecutar(await c.leer(token), codigoDeLaApp(secreto, c.reloj.ahora()));
  return { secreto, codigosDeRecuperacion };
}

describe('Inscribir la app autenticadora (HU-04.04)', () => {
  it('muestra la clave una vez, como texto y como enlace otpauth, y guarda solo el secreto cifrado', async () => {
    const c = armar();
    const token = c.abrir('11111111-0000-4000-8000-000000000001');
    const { secreto, uri, venceEn } = await c.iniciar.ejecutar(await c.leer(token));
    expect(uri).toBe(`otpauth://totp/CONTA%3A%2B57%20300%20***%204567?secret=${secreto}&issuer=CONTA&algorithm=SHA1&digits=6&period=30`);
    expect(venceEn).toEqual(new Date(c.reloj.ahora().getTime() + P.vigenciaDeLaInscripcionMs));
    const guardado = c.base.segundosFactores.get(PERSONA.valor)!.foto;
    expect(guardado.pendiente?.secretoCifrado).toMatch(/^v1\./);
    expect(JSON.stringify(guardado)).not.toContain(secreto);
    expect(c.base.eventos.map((e) => e.tipo)).toEqual(['inscripcion-iniciada']);
  });

  it('al confirmar entrega 10 códigos de recuperación y deja la sesión verificada una jornada', async () => {
    const c = armar();
    const token = c.abrir('11111111-0000-4000-8000-000000000001');
    expect((await c.leer(token)).segundoFactorVigente).toBe(false);
    const { codigosDeRecuperacion } = await inscribir(c, token);
    expect(codigosDeRecuperacion).toHaveLength(P.codigosDeRecuperacion);
    expect(await c.sesionDelToken.ejecutar(token)).toMatchObject({ segundoFactorVigente: true });
    expect(await c.consultar.ejecutar(await c.leer(token))).toMatchObject({ inscrito: true, codigosDeRecuperacionRestantes: 10 });
    expect(c.base.eventos.map((e) => e.tipo)).toEqual(['inscripcion-iniciada', 'inscrito']);

    c.reloj.avanzar(P.vigenciaDeLaVerificacionMs);
    expect(await c.sesionDelToken.ejecutar(token)).toMatchObject({ segundoFactorVigente: false });
    expect(await c.consultar.ejecutar(await c.leer(token))).toMatchObject({ inscrito: true, verificadaHasta: null });
  });

  it('un código incorrecto al confirmar se guarda como fallo y se anota', async () => {
    const c = armar();
    const token = c.abrir('11111111-0000-4000-8000-000000000001');
    await c.iniciar.ejecutar(await c.leer(token));
    const error = await rechazo(c.confirmar.ejecutar(await c.leer(token), '000000'));
    expect(error.codigo).toBe('segundo-factor.codigo-incorrecto');
    expect(c.base.segundosFactores.get(PERSONA.valor)!.foto.fallos).toBe(1);
    expect(c.base.eventos.map((e) => e.tipo)).toEqual(['inscripcion-iniciada', 'fallo']);
  });

  it('con solo el WhatsApp (otra sesión sin verificar) no se puede poner otra app', async () => {
    const c = armar();
    await inscribir(c, c.abrir('11111111-0000-4000-8000-000000000001'));
    const ladron = c.abrir('11111111-0000-4000-8000-000000000002');
    expect((await rechazo(c.iniciar.ejecutar(await c.leer(ladron)))).codigo).toBe('segundo-factor.ya-inscrito');
  });

  it('cambiar de app, recién verificado, cierra las demás sesiones de la persona', async () => {
    const c = armar();
    const propia = c.abrir('11111111-0000-4000-8000-000000000001');
    const otra = c.abrir('11111111-0000-4000-8000-000000000002');
    await inscribir(c, propia);
    c.reloj.avanzar(MINUTO);
    await inscribir(c, propia);
    expect(c.base.sesiones.get('11111111-0000-4000-8000-000000000002')?.revocadaEn).not.toBeNull();
    expect(await c.sesionDelToken.ejecutar(otra)).toBeNull();
    expect(await c.sesionDelToken.ejecutar(propia)).not.toBeNull();
    expect(c.base.eventos.at(-1)?.tipo).toBe('reemplazado');
  });
});

describe('Verificar el segundo factor (HU-04.04)', () => {
  it('con un código de la app, la sesión queda verificada; el mismo código no sirve dos veces', async () => {
    const c = armar();
    const { secreto } = await inscribir(c, c.abrir('11111111-0000-4000-8000-000000000001'));
    const nueva = c.abrir('11111111-0000-4000-8000-000000000003');
    c.reloj.avanzar(MINUTO);
    const codigo = codigoDeLaApp(secreto, c.reloj.ahora());
    const verificado = await c.verificar.ejecutar(await c.leer(nueva), codigo);
    expect(verificado).toMatchObject({ via: 'app', codigosDeRecuperacionRestantes: 10 });
    expect(verificado.verificadaHasta).toEqual(new Date(c.reloj.ahora().getTime() + P.vigenciaDeLaVerificacionMs));
    expect(await c.sesionDelToken.ejecutar(nueva)).toMatchObject({ segundoFactorVigente: true });

    const otra = c.abrir('11111111-0000-4000-8000-000000000004');
    expect((await rechazo(c.verificar.ejecutar(await c.leer(otra), codigo))).codigo).toBe('segundo-factor.codigo-incorrecto');
  });

  it('con un código de recuperación, una sola vez', async () => {
    const c = armar();
    const { codigosDeRecuperacion } = await inscribir(c, c.abrir('11111111-0000-4000-8000-000000000001'));
    const nueva = c.abrir('11111111-0000-4000-8000-000000000003');
    const primero = codigosDeRecuperacion[0]!;
    expect(await c.verificar.ejecutar(await c.leer(nueva), primero)).toMatchObject({ via: 'recuperacion', codigosDeRecuperacionRestantes: 9 });
    expect(c.base.eventos.at(-1)?.tipo).toBe('verificado-con-recuperacion');
    const otra = c.abrir('11111111-0000-4000-8000-000000000004');
    await rechazo(c.verificar.ejecutar(await c.leer(otra), primero));
  });

  it('5 fallos bloquean 15 minutos y quedan anotados', async () => {
    const c = armar();
    const { secreto } = await inscribir(c, c.abrir('11111111-0000-4000-8000-000000000001'));
    const nueva = c.abrir('11111111-0000-4000-8000-000000000003');
    for (let i = 0; i < 4; i++) await rechazo(c.verificar.ejecutar(await c.leer(nueva), '000000'));
    const bloqueo = await rechazo(c.verificar.ejecutar(await c.leer(nueva), '000000'));
    expect(bloqueo.codigo).toBe('segundo-factor.bloqueado');
    c.reloj.avanzar(MINUTO);
    expect((await rechazo(c.verificar.ejecutar(await c.leer(nueva), codigoDeLaApp(secreto, c.reloj.ahora())))).codigo).toBe(
      'segundo-factor.bloqueado',
    );
    expect(c.base.eventos.filter((e) => e.tipo === 'fallo')).toHaveLength(4);
    expect(c.base.eventos.filter((e) => e.tipo === 'bloqueado')).toHaveLength(2);
  });

  it('sin la app configurada pide configurarla', async () => {
    const c = armar();
    const token = c.abrir('11111111-0000-4000-8000-000000000001');
    expect((await rechazo(c.verificar.ejecutar(await c.leer(token), '123456'))).codigo).toBe('segundo-factor.sin-inscribir');
  });

  it('sin la clave del entorno falla cerrado', async () => {
    const c = armar(new SecretosSinClave());
    const token = c.abrir('11111111-0000-4000-8000-000000000001');
    expect((await rechazo(c.iniciar.ejecutar(await c.leer(token)))).codigo).toBe('segundo-factor.sin-configurar');
    expect(c.base.segundosFactores.size).toBe(0);
  });
});
