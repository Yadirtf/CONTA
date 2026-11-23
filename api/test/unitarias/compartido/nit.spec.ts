import fc from 'fast-check';
import { ErrorDominio, Nit } from '../../../src/compartido/dominio/index.js';


describe('Nit', () => {
  it('calcula el dígito de verificación de la DIAN (800197268-4)', () => {
    expect(Nit.de('800197268').digitoVerificacion).toBe(4);
    expect(String(Nit.de('800197268'))).toBe('800197268-4');
  });

  it.each(['', '12', '0800197268', '800.197.268', '800197268-4', '1234567890123456', ' 800197268'])(
    'rechaza %j',
    (numero) => {
      expect(() => Nit.de(numero)).toThrow(ErrorDominio);
    },
  );

  it('el dígito siempre es un solo dígito, de 0 a 9', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[1-9]\d{2,14}$/), (numero) => {
        const dv = Nit.de(numero).digitoVerificacion;
        expect(Number.isInteger(dv) && dv >= 0 && dv <= 9).toBe(true);
      }),
    );
  });
});
