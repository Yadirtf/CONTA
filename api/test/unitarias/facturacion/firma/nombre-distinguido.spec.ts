import { nombreDistinguido } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/firma/nombre-distinguido.js';

describe('X509IssuerName en formato RFC 4514 (HU-02.02)', () => {
  it('invierte el orden del certificado y separa con comas', () => {
    expect(
      nombreDistinguido([
        { tipo: 'C', valor: 'CO' },
        { tipo: 'O', valor: 'Andes SCD' },
        { tipo: 'CN', valor: 'CA ANDES SCD S.A. Clase II v3' },
      ]),
    ).toBe('CN=CA ANDES SCD S.A. Clase II v3,O=Andes SCD,C=CO');
  });

  it('escapa los caracteres especiales, el # inicial y los espacios de los extremos', () => {
    expect(nombreDistinguido([{ tipo: 'O', valor: 'A, B + "C" <D>; E\\F' }])).toBe(
      'O=A\\, B \\+ \\"C\\" \\<D\\>\\; E\\\\F',
    );
    expect(nombreDistinguido([{ tipo: 'CN', valor: '#uno ' }])).toBe('CN=\\#uno\\ ');
    expect(nombreDistinguido([{ tipo: 'CN', valor: ' dos' }])).toBe('CN=\\ dos');
  });

  it('conserva el OID cuando el atributo no tiene nombre corto', () => {
    expect(nombreDistinguido([{ tipo: '1.2.840.113549.1.9.1', valor: 'info@ejemplo.test' }])).toBe(
      '1.2.840.113549.1.9.1=info@ejemplo.test',
    );
  });
});
