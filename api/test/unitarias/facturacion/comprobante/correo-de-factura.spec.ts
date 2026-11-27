import { CorreoDeFactura, INTENTO_EN_CURSO, MAXIMO_DE_INTENTOS_DE_CORREO } from '../../../../src/modulos/facturacion/dominio/index.js';
import { codigoDe } from '../ventas/apoyo.js';

const T0 = new Date('2026-11-27T15:00:00Z');
const minutos = (m: number) => new Date(T0.getTime() + m * 60_000);

describe('Correo de la factura (HU-06.08)', () => {
  it('se pide pendiente para ya; el intento cuenta al tomarlo y termina enviado', () => {
    const correo = CorreoDeFactura.solicitar('v1', T0);
    expect(correo.tocaEnviar(T0)).toBe(true);
    correo.iniciarIntento(T0);
    expect(correo.instantanea()).toMatchObject({ estado: 'pendiente', intentos: 1, ultimaFalla: INTENTO_EN_CURSO });
    // Tomado: otro procesador no lo vuelve a tomar mientras se manda (H4).
    expect(correo.tocaEnviar(T0)).toBe(false);
    correo.enviado();
    expect(correo.instantanea()).toMatchObject({ estado: 'enviado', intentos: 1, proximoIntentoEn: null, ultimaFalla: null });
    expect(correo.tocaEnviar(minutos(60))).toBe(false);
  });

  it('espera cada vez más tras una falla pasajera y queda fallido al agotar los intentos', () => {
    const correo = CorreoDeFactura.solicitar('v1', T0);
    correo.iniciarIntento(T0);
    correo.fallo('correo.http-503', false);
    expect(correo.instantanea()).toMatchObject({ proximoIntentoEn: minutos(1), ultimaFalla: 'correo.http-503' });
    correo.iniciarIntento(T0);
    correo.fallo('correo.http-503', false);
    expect(correo.instantanea().proximoIntentoEn).toEqual(minutos(5));
    while (correo.estado === 'pendiente') {
      correo.iniciarIntento(T0);
      correo.fallo('correo.http-503', false);
    }
    expect(correo.instantanea()).toMatchObject({ estado: 'fallido', intentos: MAXIMO_DE_INTENTOS_DE_CORREO });
  });

  it('una falla permanente lo termina de una vez', () => {
    const correo = CorreoDeFactura.solicitar('v1', T0);
    correo.iniciarIntento(T0);
    correo.fallo('correo.http-400', true);
    expect(correo.instantanea()).toMatchObject({ estado: 'fallido', intentos: 1, ultimaFalla: 'correo.http-400' });
  });

  it('un intento que nadie cerró se reconoce y no se toma otro encima (H2)', () => {
    const correo = CorreoDeFactura.solicitar('v1', T0);
    correo.iniciarIntento(T0);
    const caido = CorreoDeFactura.reconstituir(correo.instantanea());
    expect(caido.intentoSinCerrar).toBe(true);
    expect(codigoDe(() => caido.iniciarIntento(minutos(2)))).toBe('correo.intento-abierto');
    caido.fallo('correo.sin-confirmar', false);
    expect(caido.intentoSinCerrar).toBe(false);
    expect(caido.intentos).toBe(1);
  });

  it('no cierra sin intento abierto, no avanza un correo terminado ni guarda códigos con datos', () => {
    const correo = CorreoDeFactura.solicitar('v1', T0);
    expect(codigoDe(() => correo.enviado())).toBe('correo.sin-intento');
    correo.iniciarIntento(T0);
    expect(codigoDe(() => correo.fallo('ana@ejemplo.test rechazado', false))).toBe('correo.falla-invalida');
    expect(codigoDe(() => correo.fallo(INTENTO_EN_CURSO, false))).toBe('correo.falla-invalida');
    correo.enviado();
    expect(codigoDe(() => correo.enviado())).toBe('correo.sin-intento');
    expect(codigoDe(() => correo.iniciarIntento(T0))).toBe('correo.cerrado');
  });
});
