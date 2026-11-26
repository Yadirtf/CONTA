import { ErrorDominio, Identificacion } from '../../../src/compartido/dominio/index.js';

const codigoDe = (accion: () => unknown): string | undefined => {
  try {
    accion();
  } catch (error) {
    if (error instanceof ErrorDominio) return error.codigo;
  }
  return undefined;
};

describe('Identificacion', () => {
  it('calcula el dígito del NIT (800197268-4, la DIAN) y no lo pone en los demás documentos', () => {
    expect(Identificacion.de('31', '800197268').digitoVerificacion).toBe(4);
    expect(Identificacion.de('13', '1020304050').digitoVerificacion).toBeNull();
  });

  it('acepta el dígito escrito cuando coincide con el calculado', () => {
    expect(Identificacion.conDigitoEscrito('31', '800197268', 4).digitoVerificacion).toBe(4);
    expect(Identificacion.conDigitoEscrito('31', '800197268', null).digitoVerificacion).toBe(4);
  });

  it('rechaza un dígito que no corresponde al NIT', () => {
    expect(codigoDe(() => Identificacion.conDigitoEscrito('31', '800197268', 5))).toBe('nit.digito-invalido');
  });

  it('rechaza un dígito en un documento que no es NIT', () => {
    expect(codigoDe(() => Identificacion.conDigitoEscrito('13', '1020304050', 3))).toBe('identificacion.digito-sin-nit');
  });

  it.each([
    ['99', '123', 'identificacion.tipo-invalido'],
    ['13', '', 'identificacion.numero-invalido'],
    ['13', '12 34', 'identificacion.numero-invalido'],
    ['41', 'A'.repeat(21), 'identificacion.numero-invalido'],
    ['31', '0800197268', 'nit.invalido'],
  ])('rechaza tipo %s con número %j', (tipo, numero, codigo) => {
    expect(codigoDe(() => Identificacion.de(tipo as never, numero))).toBe(codigo);
  });

  it('dos identificaciones son iguales si coinciden tipo y número', () => {
    expect(Identificacion.de('13', '123').esIgualA(Identificacion.de('13', '123'))).toBe(true);
    expect(Identificacion.de('13', '123').esIgualA(Identificacion.de('12', '123'))).toBe(false);
  });
});
