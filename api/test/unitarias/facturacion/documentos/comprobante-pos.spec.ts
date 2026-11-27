import { comprobanteDeVenta, ResolucionDeNumeracion } from '../../../../src/modulos/facturacion/dominio/index.js';
import { RenderizadorPdfkit } from '../../../../src/modulos/facturacion/infraestructura/comprobante-pdf/renderizador-pdfkit.js';
import { emisorDePrueba } from '../datos-de-prueba.js';
import { codigoDe } from '../ventas/apoyo.js';
import { resolucionPos, ventaPos } from './datos-pos.js';

// HU-06.02: el comprobante del tiquete POS lleva el nombre que exige la norma y el CUDE.

const cude = 'a'.repeat(96);
const datos = {
  venta: ventaPos(),
  emisor: emisorDePrueba(),
  resolucion: resolucionPos(),
  cufe: cude,
  codigoQr: `https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=${cude}`,
};

describe('Comprobante del tiquete POS', () => {
  it('se titula como documento equivalente POS y muestra el CUDE', () => {
    const c = comprobanteDeVenta(datos);
    expect(c.titulo).toBe('Documento equivalente electrónico tiquete de máquina registradora con sistema P.O.S.');
    expect(c.nombreCorto).toBe('Tiquete POS electrónico');
    expect(c.etiquetaDelCodigo).toBe('CUDE');
    expect(c.nombreDeArchivo).toBe('tiquete-pos-EPOS7.pdf');
  });

  it('no se arma con la resolución de otra clase', () => {
    const deFactura = ResolucionDeNumeracion.crear({ numero: '1', prefijo: 'EPOS', desde: 1, hasta: 9, vigenteDesde: '2026-01-01', vigenteHasta: '2026-12-31' });
    expect(codigoDe(() => comprobanteDeVenta({ ...datos, resolucion: deFactura }))).toBe('comprobante.resolucion-de-otra-clase');
  });

  it('el PDF sale y siempre igual', async () => {
    const renderizador = new RenderizadorPdfkit();
    const uno = await renderizador.pdf(comprobanteDeVenta(datos));
    const otro = await renderizador.pdf(comprobanteDeVenta(datos));
    expect(Buffer.from(uno).subarray(0, 5).toString()).toBe('%PDF-');
    expect(Buffer.from(uno).equals(Buffer.from(otro))).toBe(true);
  });
});
