import type { ErrorDominio } from '../../../src/compartido/dominio/index.js';
import { BusquedaDeProductos, nombreParaBuscar, Producto } from '../../../src/modulos/catalogo/dominio/productos/index.js';
import { AHORA, CAJERO } from './datos-de-prueba.js';
import { gaseosa, arroz } from './datos-de-productos.js';

const crear = (datos = gaseosa()) => Producto.crear(datos, CAJERO, AHORA);
const codigo = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return (e as ErrorDominio).codigo;
  }
  return undefined;
};
const textos = ({ base, iva, total }: ReturnType<Producto['venta']>) => [base.aTexto(), iva.aTexto(), total.aTexto()];

describe('Producto (HU-05.02)', () => {
  it('guarda el precio final con IVA incluido y separa base e IVA al vender una unidad', () => {
    const producto = crear(gaseosa({ precio: '10000' }));
    expect(producto.datos.precio.aTexto()).toBe('10000.00');
    expect(textos(producto.venta('1'))).toEqual(['8403.36', '1596.64', '10000.00']);
  });

  it('con 3 unidades cobra exactamente 3 × precio: separa el total de la línea, no el precio unitario', () => {
    // Por unidad daría 3 × 8.403,36 + 3 × 1.596,64… y con otros precios se perdería un centavo.
    expect(textos(crear(gaseosa({ precio: '10000' })).venta('3'))).toEqual(['25210.08', '4789.92', '30000.00']);
    expect(textos(crear(gaseosa({ precio: '2333' })).venta('7'))).toEqual(['13723.53', '2607.47', '16331.00']);
  });

  it('por peso: 0,75 kg de un producto de $12.990 el kilo', () => {
    const queso = crear(gaseosa({ precio: '12990', unidad: 'KGM', tarifaIva: '5', codigo: null }));
    expect(textos(queso.venta('0.75'))).toEqual(['9278.57', '463.93', '9742.50']);
  });

  it('marca productos excluidos o exentos: no cobran IVA', () => {
    expect(textos(crear(arroz()).venta('2'))).toEqual(['36000.00', '0.00', '36000.00']);
    const huevos = crear(arroz({ nombre: 'Huevos AA x 30', tipoDeIva: 'exento' }));
    expect(huevos.datos.iva).toEqual({ tipo: 'exento', tarifa: '0' });
    expect(textos(huevos.venta('1'))).toEqual(['18000.00', '0.00', '18000.00']);
  });

  it('un precio escrito sin IVA se convierte una vez al final: 8.403,36 + 19 % = 10.000', () => {
    const producto = crear(gaseosa({ precio: '8403.36', precioIncluyeIva: false }));
    expect(producto.datos.precio.aTexto()).toBe('10000.00');
    expect(crear(gaseosa({ precio: '1000', precioIncluyeIva: false, tarifaIva: '5' })).datos.precio.aTexto()).toBe('1050.00');
    // Exentos y excluidos: sin IVA y con IVA es lo mismo.
    expect(crear(arroz({ precioIncluyeIva: false })).datos.precio.aTexto()).toBe('18000.00');
  });

  it('rechaza precios que no son pesos: cero, negativos, más de 2 decimales, notación rara o enormes', () => {
    for (const precio of ['0', '0.00', '-5', '10.001', '1e3', '1,5', ' 10', '', 'NaN', '1000000000.01', '99999999999']) {
      expect(codigo(() => crear(gaseosa({ precio }))), precio).toBe('producto.precio-invalido');
    }
    // El tope cuenta sobre el final: una base de 900 millones más IVA lo pasa.
    expect(codigo(() => crear(gaseosa({ precio: '900000000', precioIncluyeIva: false })))).toBe('producto.precio-invalido');
    expect(crear(gaseosa({ precio: '1000000000' })).datos.precio.aTexto()).toBe('1000000000.00');
  });

  it('limpia el nombre y lo deja listo para buscar sin tildes', () => {
    const producto = crear(gaseosa({ nombre: '  Café  de‮origen\u0000 Ñame ' }));
    expect(producto.datos.nombre).toBe('Café deorigen Ñame');
    expect(producto.nombreParaBuscar).toBe('cafe deorigen name');
    expect(codigo(() => crear(gaseosa({ nombre: ' ​ ' })))).toBe('producto.nombre-invalido');
    expect(codigo(() => crear(gaseosa({ nombre: 'a'.repeat(301) })))).toBe('producto.nombre-invalido');
  });

  it('el código va en mayúsculas y sin símbolos; vacío es sin código', () => {
    expect(crear(gaseosa({ codigo: ' ab-12_c.3 ' })).datos.codigo).toBe('AB-12_C.3');
    expect(crear(gaseosa({ codigo: '   ' })).datos.codigo).toBeNull();
    for (const malo of ['con espacio', "x'or'1", 'ñ', '%', 'a'.repeat(41)]) {
      expect(codigo(() => crear(gaseosa({ codigo: malo }))), malo).toBe('producto.codigo-invalido');
    }
  });

  it('la unidad es de la lista de UN/ECE; sin unidad, 94 (unidad)', () => {
    expect(crear().datos.unidad).toBe('94');
    expect(crear(gaseosa({ unidad: 'LTR' })).datos.unidad).toBe('LTR');
    for (const mala of ['XX', 'kgm', 'constructor', '__proto__', 'toString']) {
      expect(codigo(() => crear(gaseosa({ unidad: mala }))), mala).toBe('producto.unidad-invalida');
    }
  });

  it('la cantidad vendida es positiva y con hasta 6 decimales', () => {
    const producto = crear();
    for (const mala of ['0', '-1', '1.1234567', '1e2', '', 'abc', '0.000000']) {
      expect(codigo(() => producto.venta(mala)), mala).toBe('producto.cantidad-invalida');
    }
  });
});

describe('BusquedaDeProductos', () => {
  it('normaliza el nombre como al guardar y deja el texto como comienzo de código si puede serlo', () => {
    expect(BusquedaDeProductos.de('  CAFÉ ')).toMatchObject({ nombre: 'cafe', codigo: null });
    expect(BusquedaDeProductos.de('7702')).toMatchObject({ nombre: '7702', codigo: '7702' });
    expect(BusquedaDeProductos.de('%_')).toMatchObject({ nombre: '', codigo: null });
    expect(BusquedaDeProductos.de('').esListado).toBe(true);
  });

  it('nombreParaBuscar no deja comodines de LIKE', () => {
    expect(nombreParaBuscar("100% jugo_'; drop")).toBe('100 jugo drop');
  });

  it('rechaza textos de más de 60 caracteres', () => {
    expect(codigo(() => BusquedaDeProductos.de('a'.repeat(61)))).toBe('producto.busqueda-invalida');
  });
});
