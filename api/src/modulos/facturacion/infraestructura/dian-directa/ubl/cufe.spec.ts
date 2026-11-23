import { cadenaCufe, calcularCufe, type CamposCufe } from './cufe.js';

// Ejemplo oficial del anexo técnico 1.9 (Resolución 000165 de 2023), sección 11.2.1, página 656.
const EJEMPLO_DEL_ANEXO: CamposCufe = {
  numero: '323200000129',
  fecha: '2019-01-16',
  hora: '10:53:10-05:00',
  valorBruto: '1500000.00',
  iva: '285000.00',
  inc: '0.00',
  ica: '0.00',
  total: '1785000.00',
  nitEmisor: '700085371',
  identificacionAdquirente: '800199436',
  claveTecnica: '693ff6f2a553c3646a063436fd4dd9ded0311471',
  ambiente: '1',
};

describe('CUFE', () => {
  it('compone la cadena exactamente como el ejemplo del anexo', () => {
    expect(cadenaCufe(EJEMPLO_DEL_ANEXO)).toBe(
      '3232000001292019-01-1610:53:10-05:001500000.0001285000.00040.00030.001785000.00700085371800199436693ff6f2a553c3646a063436fd4dd9ded03114711',
    );
  });

  it('da el CUFE del ejemplo del anexo', () => {
    expect(calcularCufe(EJEMPLO_DEL_ANEXO)).toBe(
      '8bb918b19ba22a694f1da11c643b5e9de39adf60311cf179179e9b33381030bcd4c3c3f156c506ed5908f9276f5bd9b4',
    );
  });
});
