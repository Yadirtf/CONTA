import { ErrorDominio } from '../../../src/compartido/dominio/index.js';
import { Cliente, CONSUMIDOR_FINAL } from '../../../src/modulos/catalogo/dominio/clientes/index.js';
import { AHORA, CAJERO, ferreteria, vecina } from './datos-de-prueba.js';

const codigoAlCrear = (datos: Parameters<typeof Cliente.crear>[0]): string | undefined => {
  try {
    Cliente.crear(datos, CAJERO, AHORA);
  } catch (error) {
    if (error instanceof ErrorDominio) return error.codigo;
  }
  return undefined;
};

describe('Cliente', () => {
  it('crea un comprador con NIT: calcula el dígito, limpia el correo y guarda quién y cuándo', () => {
    const { datos } = Cliente.crear(ferreteria(), CAJERO, AHORA);
    expect(datos.identificacion.digitoVerificacion).toBe(4);
    expect(datos.correo).toBe('compras@eltornillo.co');
    expect(datos.creadoPor).toBe(CAJERO);
    expect(datos.creadoEn).toEqual(AHORA);
  });

  it('acepta el NIT escrito con puntos y guion, y compara el dígito escrito', () => {
    expect(Cliente.crear(ferreteria({ numero: '800.197.268-4' }), CAJERO, AHORA).identificacion.numero).toBe('800197268');
    expect(codigoAlCrear(ferreteria({ numero: '800.197.268-5' }))).toBe('nit.digito-invalido');
    expect(codigoAlCrear(ferreteria({ digitoEscrito: 9 }))).toBe('nit.digito-invalido');
  });

  it('una persona sin responsabilidades queda con R-99-PN y no responsable de IVA', () => {
    const { datos } = Cliente.crear(vecina(), CAJERO, AHORA);
    expect(datos.responsabilidadesFiscales).toEqual(['R-99-PN']);
    expect(datos.responsableDeIva).toBe(false);
  });

  it('quita espacios de más y caracteres de control del nombre', () => {
    expect(Cliente.crear(vecina({ nombre: '  Rosa\u0000  Pérez \n' }), CAJERO, AHORA).datos.nombre).toBe('Rosa Pérez');
  });

  it('pasa el documento a mayúsculas (pasaportes con letras)', () => {
    expect(Cliente.crear(vecina({ tipoDeIdentificacion: '41', numero: 'ab 123456' }), CAJERO, AHORA).identificacion.numero).toBe('AB123456');
  });

  it('el número de consumidor final está reservado', () => {
    expect(codigoAlCrear(vecina({ numero: CONSUMIDOR_FINAL.identificacion.numero }))).toBe('cliente.consumidor-final');
    expect(codigoAlCrear(vecina({ tipoDeIdentificacion: '22', numero: '222.222.222.222' }))).toBe('cliente.consumidor-final');
  });

  it.each([
    [{ nombre: '   ' }, 'cliente.nombre-invalido'],
    [{ nombre: 'x'.repeat(451) }, 'cliente.nombre-invalido'],
    [{ tipoDePersona: 'otra' as never }, 'cliente.tipo-de-persona-invalido'],
    [{ responsabilidadesFiscales: ['O-1'] }, 'cliente.responsabilidad-invalida'],
    [{ responsabilidadesFiscales: ['R-99-PN', 'O-13'] }, 'cliente.responsabilidad-invalida'],
    [{ correo: 'sin-arroba' }, 'cliente.correo-invalido'],
    [{ correo: `${'a'.repeat(250)}@b.co` }, 'cliente.correo-invalido'],
    [{ direccion: { codigoMunicipio: '110', ciudad: 'Bogotá', departamento: 'Bogotá', linea: 'Calle 1' } }, 'cliente.direccion-invalida'],
    [{ direccion: { codigoMunicipio: '11001', ciudad: ' ', departamento: 'Bogotá', linea: 'Calle 1' } }, 'cliente.direccion-invalida'],
    [{ numero: '0123' }, 'nit.invalido'],
    [{ tipoDeIdentificacion: '13' as const, digitoEscrito: 4 }, 'identificacion.digito-sin-nit'],
  ])('rechaza %j', (cambios, codigo) => {
    expect(codigoAlCrear(ferreteria(cambios))).toBe(codigo);
  });

  it('las responsabilidades repetidas se guardan una vez', () => {
    expect(Cliente.crear(ferreteria({ responsabilidadesFiscales: ['O-13', 'O-13', 'O-15'] }), CAJERO, AHORA).datos.responsabilidadesFiscales).toEqual([
      'O-13',
      'O-15',
    ]);
  });
});
