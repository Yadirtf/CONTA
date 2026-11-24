import { ErrorDominio } from '../../../src/compartido/dominio/index.js';
import { Celular } from '../../../src/modulos/identidad/dominio/index.js';

describe('Celular (HU-04.01)', () => {
  it.each(['3001234567', '300 123 4567', '+57 300 123 4567', '573001234567', '(300) 123-4567'])('acepta %s y lo guarda en E.164', (texto) => {
    expect(Celular.de(texto).e164).toBe('+573001234567');
  });

  it.each(['', '6011234567', '30012345', '+1 300 123 4567', '30012345678', 'tres'])('rechaza %s', (texto) => {
    expect(() => Celular.de(texto)).toThrow(ErrorDominio);
  });

  it('se muestra enmascarado fuera de la base (Ley 1581)', () => {
    expect(Celular.de('3001234567').enmascarado()).toBe('+57 300 *** 4567');
  });
});
