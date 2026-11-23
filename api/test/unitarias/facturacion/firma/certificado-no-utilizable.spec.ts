import { CertificadoNoUtilizable } from '../../../../src/modulos/facturacion/aplicacion/firma/errores-de-firma.js';
import { CONTRASENA_DE_PRUEBA } from '../../../recursos/firma/certificados-de-prueba.js';
import { AHORA, certificadoDe, facturaSinFirmar, firmador, juegoDeCertificados } from './apoyo.js';

const UN_DIA = 24 * 60 * 60 * 1000;
const { xml } = facturaSinFirmar();

function motivo(firmar: () => unknown): string {
  try {
    firmar();
  } catch (error) {
    expect(error).toBeInstanceOf(CertificadoNoUtilizable);
    return (error as CertificadoNoUtilizable).motivo;
  }
  throw new Error('Se esperaba CertificadoNoUtilizable');
}

describe('certificados que no sirven para firmar (HU-02.02)', () => {
  const juego = juegoDeCertificados();

  it('rechaza una contraseña errónea sin mostrarla ni arrastrar el error de la librería', () => {
    const contrasena = 'contraseña-que-no-es';
    let error: unknown;
    try {
      firmador().firmar(xml, certificadoDe(juego, contrasena));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(CertificadoNoUtilizable);
    expect((error as Error).cause).toBeUndefined();
    expect(`${(error as Error).message} ${(error as Error).stack}`).not.toContain(contrasena);
    expect((error as CertificadoNoUtilizable).motivo).toBe('ilegible');
  });

  it('rechaza bytes que no son un .p12', () => {
    expect(motivo(() => firmador().firmar(xml, certificadoDe({ ...juego, p12: new Uint8Array([1, 2, 3]) })))).toBe(
      'ilegible',
    );
  });

  it('rechaza un certificado vencido o que aún no está vigente en el momento de la firma', () => {
    const vencido = juegoDeCertificados({
      desde: new Date(AHORA.getTime() - 10 * UN_DIA),
      hasta: new Date(AHORA.getTime() - UN_DIA),
    });
    expect(motivo(() => firmador().firmar(xml, certificadoDe(vencido)))).toBe('fuera-de-vigencia');
    expect(motivo(() => firmador(new Date(AHORA.getTime() - 60 * UN_DIA)).firmar(xml, certificadoDe(juego)))).toBe(
      'fuera-de-vigencia',
    );
  });

  it('rechaza un certificado sin el uso de no repudio que pide la política', () => {
    expect(motivo(() => firmador().firmar(xml, certificadoDe(juegoDeCertificados({ noRepudio: false }))))).toBe(
      'sin-uso-de-firma',
    );
  });

  it('rechaza una llave RSA de menos de 2048 bits', () => {
    expect(motivo(() => firmador().firmar(xml, certificadoDe(juegoDeCertificados({ bits: 1024 }))))).toBe('algoritmo');
  });

  it('la contraseña de prueba sí abre el certificado', () => {
    expect(() => firmador().firmar(xml, certificadoDe(juego, CONTRASENA_DE_PRUEBA))).not.toThrow();
  });
});
