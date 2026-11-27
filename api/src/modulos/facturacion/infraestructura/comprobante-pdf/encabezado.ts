import type { ComprobanteDeVenta, ParteDelComprobante } from '../../dominio/index.js';
import { ANCHO_UTIL, FUENTE, FUENTE_NEGRILLA, HOJA, imprimible, TEXTO, TEXTO_SUAVE } from './hoja.js';

/** Título, número y fecha, y los dos bloques de quién vende y quién compra. Deja el cursor debajo. */
export function dibujarEncabezado(doc: PDFKit.PDFDocument, c: ComprobanteDeVenta): void {
  const x = HOJA.margen;
  doc.font(FUENTE_NEGRILLA).fontSize(16).fillColor(TEXTO).text(imprimible(c.emisor.nombre), x, HOJA.margen, { width: ANCHO_UTIL });
  doc.moveDown(0.3);
  doc.font(FUENTE_NEGRILLA).fontSize(12).text(`${c.titulo} ${c.numero}`, { width: ANCHO_UTIL });
  doc.font(FUENTE).fontSize(9).fillColor(TEXTO_SUAVE).text(`Emitida el ${c.emitida}`, { width: ANCHO_UTIL });
  doc.moveDown(0.8);

  const arriba = doc.y;
  const mitad = (ANCHO_UTIL - 20) / 2;
  const finEmisor = dibujarParte(doc, 'Vende', c.emisor, x, arriba, mitad);
  const finAdquirente = dibujarParte(doc, 'Compra', c.adquirente, x + mitad + 20, arriba, mitad);
  doc.x = x;
  doc.y = Math.max(finEmisor, finAdquirente) + 12;
}

function dibujarParte(doc: PDFKit.PDFDocument, rotulo: string, parte: ParteDelComprobante, x: number, y: number, ancho: number): number {
  doc.font(FUENTE_NEGRILLA).fontSize(8).fillColor(TEXTO_SUAVE).text(rotulo.toUpperCase(), x, y, { width: ancho });
  doc.font(FUENTE_NEGRILLA).fontSize(10).fillColor(TEXTO).text(imprimible(parte.nombre), x, doc.y, { width: ancho });
  doc.font(FUENTE).fontSize(9).text(parte.identificacion, x, doc.y, { width: ancho });
  for (const detalle of parte.detalles) doc.fillColor(TEXTO_SUAVE).text(imprimible(detalle), x, doc.y, { width: ancho });
  return doc.y;
}
