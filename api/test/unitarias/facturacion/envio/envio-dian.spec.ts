import { ErrorDominio } from '../../../../src/compartido/dominio/index.js';
import {
  EnvioDian,
  esperaDeConsulta,
  esperaTrasFalla,
  MAXIMO_DE_INTENTOS,
  RespuestaDeLaDian,
} from '../../../../src/modulos/facturacion/dominio/index.js';

const CUFE = 'f'.repeat(96);
const T0 = new Date('2026-11-23T15:00:00Z');
const en = (ms: number) => new Date(T0.getTime() + ms);
const respuesta = (valida: boolean, codigo: string, mensajes: string[] = []) =>
  RespuestaDeLaDian.de({ valida, codigo, descripcion: '', mensajes });

describe('EnvioDian: máquina de estados del envío (HU-02.03)', () => {
  it('nace pendiente y toca enviarlo de inmediato', () => {
    const envio = EnvioDian.solicitar('e1', CUFE, 'SETP1', T0);
    expect(envio.estado).toBe('pendiente');
    expect(envio.siguientePaso).toBe('enviar');
    expect(envio.tocaIntentar(T0)).toBe(true);
  });

  it('rechaza un CUFE que no es SHA-384 en hexadecimal', () => {
    expect(() => EnvioDian.solicitar('e1', 'abc', 'SETP1', T0)).toThrow(ErrorDominio);
  });

  it('recibido → en validación → aceptado, contando cada llamada', () => {
    const envio = EnvioDian.solicitar('e1', CUFE, 'SETP1', T0);
    envio.recibido('zip-1', T0);
    expect(envio.estado).toBe('en-validacion');
    expect(envio.siguientePaso).toBe('consultar');
    expect(envio.proximoIntentoEn).toEqual(en(esperaDeConsulta(1)));
    envio.respondido(respuesta(true, '00'), en(5000));
    expect(envio.estado).toBe('aceptado');
    expect(envio.intentos).toBe(2);
    expect(envio.tocaIntentar(en(10 ** 9))).toBe(false);
  });

  it('una validación en proceso vuelve a consultar con espera creciente', () => {
    const envio = EnvioDian.solicitar('e1', CUFE, 'SETP1', T0);
    envio.recibido('zip-1', T0);
    envio.respondido(respuesta(false, ''), T0);
    expect(envio.estado).toBe('en-validacion');
    expect(envio.proximoIntentoEn).toEqual(en(esperaDeConsulta(2)));
  });

  it('código 99 o inválida con mensajes es rechazo, con los mensajes guardados', () => {
    const envio = EnvioDian.solicitar('e1', CUFE, 'SETP1', T0);
    envio.recibido('zip-1', T0);
    envio.respondido(respuesta(false, '99', ['Regla: FAK24, Rechazo: ...']), T0);
    expect(envio.estado).toBe('rechazado');
    expect(envio.respuesta?.mensajes).toEqual(['Regla: FAK24, Rechazo: ...']);
  });

  it('un paquete rechazado al recibirlo (sin ZipKey) queda rechazado', () => {
    const envio = EnvioDian.solicitar('e1', CUFE, 'SETP1', T0);
    envio.respondido(respuesta(false, '', ['El NIT no está habilitado']), T0);
    expect(envio.estado).toBe('rechazado');
  });

  it('las fallas de comunicación se reintentan con espera exponencial y, al agotar los intentos, queda fallido', () => {
    const envio = EnvioDian.solicitar('e1', CUFE, 'SETP1', T0);
    envio.fallaDeComunicacion(T0);
    expect(envio.proximoIntentoEn).toEqual(en(esperaTrasFalla(1)));
    envio.fallaDeComunicacion(T0);
    expect(envio.proximoIntentoEn).toEqual(en(esperaTrasFalla(2)));
    for (let i = 2; i < MAXIMO_DE_INTENTOS; i++) envio.fallaDeComunicacion(T0);
    expect(envio.estado).toBe('fallido');
    expect(envio.proximoIntentoEn).toBeNull();
  });

  it('un envío terminado no acepta más cambios', () => {
    const envio = EnvioDian.solicitar('e1', CUFE, 'SETP1', T0);
    envio.recibido('zip-1', T0);
    envio.respondido(respuesta(true, '00'), T0);
    expect(() => envio.fallaDeComunicacion(T0)).toThrow(/ya terminó/);
    expect(() => envio.respondido(respuesta(true, '00'), T0)).toThrow(/ya terminó/);
  });

  it('las esperas crecen y tienen techo', () => {
    expect([1, 2, 3].map(esperaTrasFalla)).toEqual([30_000, 60_000, 120_000]);
    expect(esperaTrasFalla(50)).toBe(3_600_000);
    expect([1, 2, 3].map(esperaDeConsulta)).toEqual([5_000, 10_000, 20_000]);
    expect(esperaDeConsulta(50)).toBe(300_000);
  });

  it('la respuesta recorta textos largos y descarta mensajes vacíos', () => {
    const r = RespuestaDeLaDian.de({ valida: false, codigo: ' 99 ', descripcion: 'x'.repeat(5000), mensajes: ['', ' a '] });
    expect(r.codigo).toBe('99');
    expect(r.descripcion).toHaveLength(2000);
    expect(r.mensajes).toEqual(['a']);
  });
});

describe('RespuestaDeLaDian con el ApplicationResponse (HU-06.08)', () => {
  const de = (documento: string | null | undefined) =>
    RespuestaDeLaDian.de({ valida: true, codigo: '00', descripcion: 'ok', mensajes: [], documento }).documento;

  it('lo guarda en base64 sin espacios y descarta uno mal formado sin cambiar el resultado', () => {
    expect(de('PEFw\ncGxp')).toBe('PEFwcGxp');
    expect(de('<ApplicationResponse/>')).toBeNull();
    expect(de('')).toBeNull();
    expect(de(undefined)).toBeNull();
    expect(RespuestaDeLaDian.de({ valida: true, codigo: '00', descripcion: 'ok', mensajes: [], documento: '<x>' }).resultado).toBe('aceptado');
  });
});
