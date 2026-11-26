import { exigeSegundoFactor } from '../../../src/compartido/dominio/index.js';
import {
  ErrorDeSegundoFactor,
  IdUsuario,
  POLITICA_DE_SEGUNDO_FACTOR as P,
  SegundoFactor,
  type Sesion,
  segundoFactorHasta,
  tieneSegundoFactorVigente,
  verificoHacePoco,
} from '../../../src/modulos/identidad/dominio/index.js';

// Reglas del segundo factor (HU-04.04, ADR-0013). El agregado no sabe de criptografía: las pruebas le dicen
// con qué paso coincide un código.

const PERSONA = IdUsuario.de('44444444-4444-4444-8444-444444444444');
const T0 = new Date('2026-11-26T15:00:00Z');
const despues = (ms: number) => new Date(T0.getTime() + ms);
const MINUTO = 60_000;

const coincideEn = (paso: number) => () => paso;
const noCoincide = () => null;
const sinRecuperacion = () => null;

/** Un factor ya inscrito con el secreto 'v1.a.b.c' y el paso 100 usado. */
function inscrito(): SegundoFactor {
  const factor = SegundoFactor.nuevo(PERSONA);
  factor.iniciarInscripcion('v1.a.b.c', T0, false);
  const confirmacion = factor.confirmarInscripcion(T0, coincideEn(100), ['h1', 'h2']);
  expect(confirmacion).toEqual({ acerto: true, reemplazo: false });
  return factor;
}

describe('exigeSegundoFactor', () => {
  it('lo exige al rol contador y a cualquiera en modo contador; no a dueño ni cajero en modo simple', () => {
    expect(exigeSegundoFactor('contador', 'contador')).toBe(true);
    expect(exigeSegundoFactor('contador', 'simple')).toBe(true);
    expect(exigeSegundoFactor('dueno', 'contador')).toBe(true);
    expect(exigeSegundoFactor('dueno', 'simple')).toBe(false);
    expect(exigeSegundoFactor('cajero', 'simple')).toBe(false);
  });
});

describe('SegundoFactor: inscripción', () => {
  it('queda inscrito al confirmar con un primer código, con sus códigos de recuperación', () => {
    const factor = inscrito();
    expect(factor.inscrito).toBe(true);
    expect(factor.foto).toMatchObject({ secretoCifrado: 'v1.a.b.c', confirmadoEn: T0, pendiente: null, ultimoPaso: 100 });
    expect(factor.foto.huellasDeRecuperacion).toEqual(['h1', 'h2']);
  });

  it('sin inscripción pendiente o con una vencida, no confirma ni cuenta un fallo', () => {
    const factor = SegundoFactor.nuevo(PERSONA);
    expect(factor.confirmarInscripcion(T0, coincideEn(1), [])).toMatchObject({ error: { codigo: 'segundo-factor.sin-inscripcion-pendiente' } });
    factor.iniciarInscripcion('v1.a.b.c', T0, false);
    const tarde = despues(P.vigenciaDeLaInscripcionMs);
    expect(factor.confirmarInscripcion(tarde, coincideEn(1), [])).toMatchObject({ error: { codigo: 'segundo-factor.sin-inscripcion-pendiente' } });
    expect(factor.foto.fallos).toBe(0);
  });

  it('un código incorrecto al confirmar cuenta como fallo y no inscribe', () => {
    const factor = SegundoFactor.nuevo(PERSONA);
    factor.iniciarInscripcion('v1.a.b.c', T0, false);
    expect(factor.confirmarInscripcion(T0, noCoincide, [])).toMatchObject({
      error: { codigo: 'segundo-factor.codigo-incorrecto', detalle: { intentosRestantes: 4 } },
    });
    expect(factor.inscrito).toBe(false);
  });

  it('cambiar de app exige haber verificado hace poco: el WhatsApp solo no basta', () => {
    const factor = inscrito();
    expect(() => factor.iniciarInscripcion('v1.x.y.z', T0, false)).toThrow(ErrorDeSegundoFactor);
    factor.iniciarInscripcion('v1.x.y.z', T0, true);
    // Mientras no confirme, la app anterior sigue siendo la que vale.
    expect(factor.foto.secretoCifrado).toBe('v1.a.b.c');
    const cambio = factor.confirmarInscripcion(despues(MINUTO), coincideEn(102), ['h9']);
    expect(cambio).toEqual({ acerto: true, reemplazo: true });
    expect(factor.foto).toMatchObject({ secretoCifrado: 'v1.x.y.z', huellasDeRecuperacion: ['h9'] });
  });
});

describe('SegundoFactor: verificación', () => {
  it('sin inscribir no verifica', () => {
    expect(SegundoFactor.nuevo(PERSONA).verificar(T0, coincideEn(1), sinRecuperacion)).toMatchObject({
      error: { codigo: 'segundo-factor.sin-inscribir' },
    });
  });

  it('acepta un código de un paso nuevo y no deja repetir el mismo código (anti-repetición)', () => {
    const factor = inscrito();
    expect(factor.verificar(T0, coincideEn(101), sinRecuperacion)).toEqual({ acerto: true, via: 'app' });
    expect(factor.verificar(T0, coincideEn(101), sinRecuperacion)).toMatchObject({ error: { codigo: 'segundo-factor.codigo-incorrecto' } });
    expect(factor.verificar(T0, coincideEn(100), sinRecuperacion)).toMatchObject({ acerto: false });
  });

  it('un código de recuperación sirve una sola vez', () => {
    const factor = inscrito();
    expect(factor.verificar(T0, noCoincide, (h) => h.indexOf('h2'))).toEqual({ acerto: true, via: 'recuperacion' });
    expect(factor.foto.huellasDeRecuperacion).toEqual(['h1']);
    const otraVez = (huellas: readonly string[]) => (huellas.includes('h2') ? huellas.indexOf('h2') : null);
    expect(factor.verificar(T0, noCoincide, otraVez)).toMatchObject({ acerto: false });
  });

  it('5 fallos seguidos bloquean 15 minutos, aunque luego llegue el código correcto; después vuelve a servir', () => {
    const factor = inscrito();
    for (let i = 1; i < P.fallosAntesDelBloqueo; i++) {
      expect(factor.verificar(T0, noCoincide, sinRecuperacion)).toMatchObject({ error: { detalle: { intentosRestantes: 5 - i } } });
    }
    const bloqueo = factor.verificar(T0, noCoincide, sinRecuperacion);
    expect(bloqueo).toMatchObject({ error: { codigo: 'segundo-factor.bloqueado' } });
    expect(factor.verificar(despues(14 * MINUTO), coincideEn(200), sinRecuperacion)).toMatchObject({
      error: { codigo: 'segundo-factor.bloqueado' },
    });
    expect(() => factor.iniciarInscripcion('v1.x.y.z', despues(MINUTO), true)).toThrow(ErrorDeSegundoFactor);
    expect(factor.verificar(despues(P.duracionDelBloqueoMs), coincideEn(200), sinRecuperacion)).toEqual({ acerto: true, via: 'app' });
  });

  it('un acierto borra los fallos acumulados', () => {
    const factor = inscrito();
    factor.verificar(T0, noCoincide, sinRecuperacion);
    factor.verificar(T0, coincideEn(150), sinRecuperacion);
    expect(factor.foto.fallos).toBe(0);
  });
});

describe('verificación de la sesión', () => {
  const sesion = (verificadaEn: Date | null, venceEn = despues(30 * 24 * 60 * MINUTO)): Sesion => ({
    id: 's',
    usuarioId: PERSONA,
    creadaEn: T0,
    venceEn,
    verificadaEn,
  });

  it('sin verificar no tiene segundo factor', () => {
    expect(segundoFactorHasta(sesion(null))).toBeNull();
    expect(tieneSegundoFactorVigente(sesion(null), T0)).toBe(false);
    expect(verificoHacePoco(sesion(null), T0)).toBe(false);
  });

  it('una verificación vale una jornada de 12 horas', () => {
    const s = sesion(T0);
    expect(segundoFactorHasta(s)).toEqual(despues(P.vigenciaDeLaVerificacionMs));
    expect(tieneSegundoFactorVigente(s, despues(P.vigenciaDeLaVerificacionMs - 1))).toBe(true);
    expect(tieneSegundoFactorVigente(s, despues(P.vigenciaDeLaVerificacionMs))).toBe(false);
  });

  it('nunca vale más allá de la sesión', () => {
    expect(segundoFactorHasta(sesion(T0, despues(MINUTO)))).toEqual(despues(MINUTO));
  });

  it('verificó hace poco solo en los primeros 10 minutos', () => {
    expect(verificoHacePoco(sesion(T0), despues(P.verificacionRecienteMs - 1))).toBe(true);
    expect(verificoHacePoco(sesion(T0), despues(P.verificacionRecienteMs))).toBe(false);
  });
});
