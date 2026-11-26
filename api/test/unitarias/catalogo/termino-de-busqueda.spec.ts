import fc from 'fast-check';
import { ErrorDominio } from '../../../src/compartido/dominio/index.js';
import { TerminoDeBusqueda } from '../../../src/modulos/catalogo/dominio/clientes/index.js';

describe('TerminoDeBusqueda', () => {
  it('limpia puntos, espacios y lo que va después del guion', () => {
    expect(TerminoDeBusqueda.de(' 800.197.268-4 ').prefijo).toBe('800197268');
    expect(TerminoDeBusqueda.de('ab12').prefijo).toBe('AB12');
  });

  it('si es un NIT posible trae su dígito de verificación', () => {
    expect(TerminoDeBusqueda.de('800197268').nit?.digitoVerificacion).toBe(4);
    expect(TerminoDeBusqueda.de('AB123').nit).toBeNull();
    expect(TerminoDeBusqueda.de('0123').nit).toBeNull();
  });

  it.each(['900-373-076', 'stra\u00dfe', '', '12', '1.2', '%%%', '12_3', "1' OR '1'='1", 'a'.repeat(21)])('rechaza %j', (texto) => {
    expect(() => TerminoDeBusqueda.de(texto)).toThrow(ErrorDominio);
  });

  it('nunca deja pasar comodines de LIKE ni comillas', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 40 }), (texto) => {
        try {
          expect(TerminoDeBusqueda.de(texto).prefijo).toMatch(/^[A-Z0-9]{3,20}$/);
        } catch (error) {
          expect(error).toBeInstanceOf(ErrorDominio);
        }
      }),
    );
  });
});
