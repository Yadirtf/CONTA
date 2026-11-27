import { ErrorDominio } from '../../../../src/compartido/dominio/index.js';
import { codigoDeFalla, siguienteIntento } from '../../../../src/modulos/facturacion/aplicacion/ventas/falla-de-emision.js';

// HU-06.01 (hallazgo H2): de una falla de emisión se guarda solo un código, nunca el mensaje.

describe('Falla de emisión', () => {
  it('guarda el código del dominio o el nombre del error, limpio y corto', () => {
    expect(codigoDeFalla(new ErrorDominio('facturacion.no-habilitada', 'x'))).toBe('facturacion.no-habilitada');
    class CertificadoNoUtilizable extends Error {
      override name = 'CertificadoNoUtilizable';
    }
    expect(codigoDeFalla(new CertificadoNoUtilizable('clave del .p12: secreta'))).toBe('CertificadoNoUtilizable');
    const raro = new Error('x');
    raro.name = 'Nombre con espacios <y> marcas'.repeat(5);
    expect(codigoDeFalla(raro)).toMatch(/^[A-Za-z0-9._-]{1,64}$/);
    expect(codigoDeFalla('texto suelto')).toBe('desconocida');
  });

  it('espera cada vez más entre intentos, con techo de una hora', () => {
    const ahora = new Date('2026-11-27T15:00:00Z');
    const espera = (n: number) => siguienteIntento(ahora, n).getTime() - ahora.getTime();
    expect([1, 2, 3].map(espera)).toEqual([30_000, 60_000, 120_000]);
    expect(espera(50)).toBe(60 * 60_000);
  });
});
