import { FirmarDocumentoElectronico } from '../../../../src/modulos/facturacion/aplicacion/comandos/firmar-documento-electronico.js';
import { CertificadoDeFirma } from '../../../../src/modulos/facturacion/aplicacion/firma/certificado-de-firma.js';
import type { FirmadorDeDocumentos } from '../../../../src/modulos/facturacion/aplicacion/puertos/firmador-de-documentos.js';

describe('FirmarDocumentoElectronico (HU-02.02)', () => {
  it('entrega el XML firmado por el puerto y conserva el CUFE', () => {
    const certificado = CertificadoDeFirma.de(new Uint8Array([1]), 'x');
    const firmador: FirmadorDeDocumentos = {
      firmar: vi.fn((xml: string) => `${xml}<firmado/>`),
    };
    const resultado = new FirmarDocumentoElectronico(firmador).ejecutar({ xml: '<a/>', cufe: 'abc' }, certificado);
    expect(resultado).toEqual({ xml: '<a/><firmado/>', cufe: 'abc' });
    expect(firmador.firmar).toHaveBeenCalledWith('<a/>', certificado);
  });
});
