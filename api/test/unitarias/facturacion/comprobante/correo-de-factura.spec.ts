import { CorreoDeFactura, MAXIMO_DE_INTENTOS_DE_CORREO } from '../../../../src/modulos/facturacion/dominio/index.js';
import { codigoDe } from '../ventas/apoyo.js';

const T0 = new Date('2026-11-27T15:00:00Z');
const minutos = (m: number) => new Date(T0.getTime() + m * 60_000);

describe('Correo de la factura (HU-06.08)', () => {
  it('se pide pendiente para ya y termina enviado', () => {
    const correo = CorreoDeFactura.solicitar('v1', T0);
    expect(correo.tocaEnviar(T0)).toBe(true);
    correo.enviado();
    expect(correo.instantanea()).toMatchObject({ estado: 'enviado', intentos: 1, proximoIntentoEn: null });
    expect(correo.tocaEnviar(minutos(60))).toBe(false);
  });

  it('espera cada vez más tras una falla pasajera y queda fallido al agotar los intentos', () => {
    const correo = CorreoDeFactura.solicitar('v1', T0);
    correo.fallo('correo.http-503', false, T0);
    expect(correo.instantanea().proximoIntentoEn).toEqual(minutos(1));
    expect(correo.tocaEnviar(T0)).toBe(false);
    correo.fallo('correo.http-503', false, T0);
    expect(correo.instantanea().proximoIntentoEn).toEqual(minutos(5));
    while (correo.instantanea().estado === 'pendiente') correo.fallo('correo.http-503', false, T0);
    expect(correo.instantanea()).toMatchObject({ estado: 'fallido', intentos: MAXIMO_DE_INTENTOS_DE_CORREO });
  });

  it('una falla permanente lo termina de una vez', () => {
    const correo = CorreoDeFactura.solicitar('v1', T0);
    correo.fallo('correo.http-400', true, T0);
    expect(correo.instantanea()).toMatchObject({ estado: 'fallido', intentos: 1, ultimaFalla: 'correo.http-400' });
  });

  it('no avanza un correo terminado ni guarda códigos con datos', () => {
    const correo = CorreoDeFactura.solicitar('v1', T0);
    expect(codigoDe(() => correo.fallo('ana@ejemplo.test rechazado', false, T0))).toBe('correo.falla-invalida');
    correo.enviado();
    expect(codigoDe(() => correo.enviado())).toBe('correo.cerrado');
    expect(codigoDe(() => correo.fallo('correo.x', false, T0))).toBe('correo.cerrado');
  });
});
