import { BadRequestException } from '@nestjs/common';
import { productoNuevoDe } from '../../../src/modulos/catalogo/presentacion/http/lectura-de-producto.js';
import { textoDeBusquedaDe } from '../../../src/modulos/catalogo/presentacion/http/busqueda-de-productos.js';

const valido = { id: '0b7d1a52-5f8c-4c39-9f43-2a8e7f1c0d11', nombre: 'Gaseosa', precio: '2500', tipoDeIva: 'gravado', tarifaIva: '19' };
const campoRechazado = (cuerpo: unknown): string | undefined => {
  try {
    productoNuevoDe(cuerpo);
  } catch (e) {
    if (e instanceof BadRequestException) return (e.getResponse() as { mensaje: string }).mensaje;
    throw e;
  }
  return undefined;
};

describe('lectura del cuerpo de POST /productos', () => {
  it('lee lo mínimo y pone los valores por defecto (precio con IVA incluido, sin código ni unidad)', () => {
    expect(productoNuevoDe(valido)).toEqual({ ...valido, codigo: null, unidad: null, precioIncluyeIva: true });
  });

  it('rechaza tipos inesperados sin llegar al dominio', () => {
    const casos: [object, string][] = [
      [{ ...valido, id: 'no-es-uuid' }, 'id'],
      [{ ...valido, id: valido.id.toUpperCase() }, 'id'],
      [{ ...valido, precio: 2500 }, 'precio'], // un number ya perdió precisión
      [{ ...valido, precio: { $ne: '' } }, 'precio'],
      [{ ...valido, precio: '1'.repeat(21) }, 'precio'],
      [{ ...valido, nombre: ['a'] }, 'nombre'],
      [{ ...valido, nombre: 'a'.repeat(401) }, 'nombre'],
      [{ ...valido, tipoDeIva: 'gravado-19' }, 'tipoDeIva'],
      [{ ...valido, tipoDeIva: '__proto__' }, 'tipoDeIva'],
      [{ ...valido, tarifaIva: 19 }, 'tarifaIva'],
      [{ ...valido, codigo: 7702 }, 'codigo'],
      [{ ...valido, unidad: ['94'] }, 'unidad'],
      [{ ...valido, precioIncluyeIva: 'false' }, 'precioIncluyeIva'],
    ];
    for (const [cuerpo, campo] of casos) expect(campoRechazado(cuerpo), campo).toBe(`Revisa el campo ${campo}`);
    expect(campoRechazado(null)).toBe('Revisa el campo id');
    expect(campoRechazado([valido])).toBe('Revisa el campo id');
  });

  it('?buscar= acepta texto corto y rechaza arreglos y objetos', () => {
    expect(textoDeBusquedaDe(undefined)).toBe('');
    expect(textoDeBusquedaDe('café')).toBe('café');
    for (const malo of [['a', 'b'], { x: '1' }, 'a'.repeat(61)]) expect(() => textoDeBusquedaDe(malo)).toThrow(BadRequestException);
  });
});
