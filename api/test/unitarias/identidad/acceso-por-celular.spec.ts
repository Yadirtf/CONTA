import { AccesoPorCelular, Celular, type ErrorDeAcceso, POLITICA_DE_ACCESO as P } from '../../../src/modulos/identidad/dominio/index.js';

const T0 = new Date('2026-11-23T15:00:00Z');
const en = (ms: number) => new Date(T0.getTime() + ms);
const MIN = 60_000;
const celular = Celular.de('3001234567');
const bien = () => true;
const mal = () => false;
const motivo = (accion: () => unknown) => {
  try {
    accion();
  } catch (error) {
    return (error as ErrorDeAcceso).codigo;
  }
  return null;
};

function conCodigo(): AccesoPorCelular {
  const acceso = AccesoPorCelular.nuevo(celular);
  acceso.emitirCodigo('h1', T0);
  return acceso;
}

describe('AccesoPorCelular (HU-04.01)', () => {
  it('el código vence a los 10 minutos', () => {
    expect(conCodigo().foto.codigo?.venceEn).toEqual(en(10 * MIN));
    expect(conCodigo().verificar(en(10 * MIN - 1), bien).acerto).toBe(true);
    const vencido = conCodigo().verificar(en(10 * MIN), bien);
    expect(!vencido.acerto && vencido.error.codigo).toBe('acceso.sin-codigo');
  });

  it('un código sirve una sola vez', () => {
    const acceso = conCodigo();
    expect(acceso.verificar(en(MIN), bien).acerto).toBe(true);
    const otraVez = acceso.verificar(en(MIN), bien);
    expect(!otraVez.acerto && otraVez.error.codigo).toBe('acceso.sin-codigo');
  });

  it('cuenta los intentos que quedan y al quinto fallo bloquea 15 minutos', () => {
    const acceso = conCodigo();
    for (let i = 1; i < P.fallosAntesDelBloqueo; i++) {
      const r = acceso.verificar(en(i * 1000), mal);
      expect(!r.acerto && r.error.detalle.intentosRestantes).toBe(P.fallosAntesDelBloqueo - i);
    }
    const quinto = acceso.verificar(en(5000), mal);
    expect(!quinto.acerto && quinto.error.codigo).toBe('acceso.bloqueado');
    expect(!quinto.acerto && quinto.error.detalle.reintentarDesde).toEqual(en(5000 + 15 * MIN));
    expect(acceso.foto.codigo).toBeNull();
  });

  it('bloqueado no acepta ni el código correcto ni pedir otro, y a los 15 minutos vuelve a funcionar', () => {
    const acceso = conCodigo();
    for (let i = 0; i < P.fallosAntesDelBloqueo; i++) acceso.verificar(T0, mal);
    const r = acceso.verificar(en(MIN), bien);
    expect(!r.acerto && r.error.codigo).toBe('acceso.bloqueado');
    expect(motivo(() => acceso.emitirCodigo('h2', en(14 * MIN)))).toBe('acceso.bloqueado');
    acceso.emitirCodigo('h3', en(15 * MIN));
    expect(acceso.verificar(en(16 * MIN), bien).acerto).toBe(true);
  });

  it('pedir un código nuevo no borra los fallos: no sirve para seguir adivinando', () => {
    const acceso = conCodigo();
    for (let i = 0; i < 4; i++) acceso.verificar(en(i), mal);
    acceso.emitirCodigo('h2', en(2 * MIN));
    const r = acceso.verificar(en(2 * MIN + 1), mal);
    expect(!r.acerto && r.error.codigo).toBe('acceso.bloqueado');
  });

  it('un acierto borra los fallos', () => {
    const acceso = conCodigo();
    acceso.verificar(T0, mal);
    acceso.verificar(T0, bien);
    expect(acceso.foto.fallos).toBe(0);
  });

  it('exige 1 minuto entre códigos y como máximo 5 por hora', () => {
    const acceso = conCodigo();
    expect(motivo(() => acceso.emitirCodigo('x', en(59_000)))).toBe('acceso.espera');
    for (let i = 1; i < P.codigosPorHora; i++) acceso.emitirCodigo('x', en(i * MIN));
    expect(motivo(() => acceso.emitirCodigo('x', en(10 * MIN)))).toBe('acceso.limite');
    expect(motivo(() => acceso.emitirCodigo('x', en(60 * MIN)))).toBeNull();
  });

  it('sin código emitido, un intento no cuenta como fallo', () => {
    const acceso = AccesoPorCelular.nuevo(celular);
    acceso.verificar(T0, mal);
    expect(acceso.foto.fallos).toBe(0);
  });
});
