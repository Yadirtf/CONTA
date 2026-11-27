import type { ComprobanteDeVenta } from '../../dominio/index.js';
import { ANCHO_UTIL, FUENTE, FUENTE_NEGRILLA, HOJA, TEXTO, TEXTO_SUAVE } from './hoja.js';
import { dibujarQr } from './qr-vectorial.js';

const LADO_DEL_QR = 110;
const ALTO_DEL_PIE = 260;

/** Totales, forma de pago, resolución, CUFE o CUDE y QR: lo que la DIAN pide ver. Si no cabe, va en otra hoja. */
export function dibujarPieFiscal(doc: PDFKit.PDFDocument, c: ComprobanteDeVenta): void {
  if (doc.y + ALTO_DEL_PIE > HOJA.alto - HOJA.margen) {
    doc.addPage();
    doc.y = HOJA.margen;
  }
  const anchoEtiqueta = ANCHO_UTIL * 0.7;
  for (const [etiqueta, valor] of c.totales) {
    const esTotal = etiqueta === 'Total';
    const y = doc.y;
    doc.font(esTotal ? FUENTE_NEGRILLA : FUENTE).fontSize(esTotal ? 12 : 9).fillColor(TEXTO);
    doc.text(etiqueta, HOJA.margen, y, { width: anchoEtiqueta, align: 'right' });
    doc.text(valor, HOJA.margen + anchoEtiqueta, y, { width: ANCHO_UTIL - anchoEtiqueta, align: 'right' });
  }
  doc.font(FUENTE).fontSize(9).text(`Forma de pago: ${c.pago}`, HOJA.margen, doc.y + 6, { width: ANCHO_UTIL });
  doc.moveDown(1);

  const arriba = doc.y;
  dibujarQr(doc, c.codigoQr, HOJA.margen, arriba, LADO_DEL_QR);
  const x = HOJA.margen + LADO_DEL_QR + 16;
  const ancho = ANCHO_UTIL - LADO_DEL_QR - 16;
  doc.font(FUENTE_NEGRILLA).fontSize(8).fillColor(TEXTO).text(c.etiquetaDelCodigo, x, arriba, { width: ancho });
  doc.font(FUENTE).fontSize(7).text(c.cufe, x, doc.y, { width: ancho });
  doc.moveDown(0.5);
  doc.fillColor(TEXTO_SUAVE).fontSize(8).text(c.resolucion, x, doc.y, { width: ancho });
  doc.moveDown(0.5);
  doc.text('Escanea el código para consultar este documento en la DIAN.', x, doc.y, { width: ancho });
  doc.text(`Representación gráfica: ${c.nombreCorto.toLowerCase()}. Generada con CONTA.`, x, doc.y, { width: ancho });
  doc.x = HOJA.margen;
  doc.y = Math.max(doc.y, arriba + LADO_DEL_QR) + 8;
}
