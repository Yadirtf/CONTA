import type { LineaDelComprobante } from '../../dominio/index.js';
import { ANCHO_UTIL, FUENTE, FUENTE_NEGRILLA, HOJA, imprimible, LINEA, TEXTO } from './hoja.js';

/** Columnas: descripción ancha y los números alineados a la derecha. */
const COLUMNAS = [
  { titulo: 'Producto', ancho: 0.4, alinear: 'left' },
  { titulo: 'Cant.', ancho: 0.1, alinear: 'right' },
  { titulo: 'Precio con IVA', ancho: 0.18, alinear: 'right' },
  { titulo: 'IVA', ancho: 0.12, alinear: 'right' },
  { titulo: 'Total', ancho: 0.2, alinear: 'right' },
] as const;

const ESPACIO = 6;

/** La tabla de lo vendido; si no cabe, sigue en otra hoja y repite los títulos. */
export function dibujarLineas(doc: PDFKit.PDFDocument, lineas: readonly LineaDelComprobante[]): void {
  dibujarFila(doc, COLUMNAS.map((c) => c.titulo), true);
  for (const linea of lineas) {
    const celdas = [imprimible(linea.descripcion), linea.cantidad, linea.precioConIva, linea.iva, linea.total];
    if (doc.y + altoDe(doc, celdas) > HOJA.alto - HOJA.margen) {
      doc.addPage();
      doc.y = HOJA.margen;
      dibujarFila(doc, COLUMNAS.map((c) => c.titulo), true);
    }
    dibujarFila(doc, celdas, false);
  }
  doc.moveDown(0.5);
}

function dibujarFila(doc: PDFKit.PDFDocument, celdas: readonly string[], esTitulo: boolean): void {
  doc.font(esTitulo ? FUENTE_NEGRILLA : FUENTE).fontSize(9).fillColor(TEXTO);
  const arriba = doc.y;
  const alto = altoDe(doc, celdas);
  let x = HOJA.margen;
  COLUMNAS.forEach((columna, i) => {
    const ancho = columna.ancho * ANCHO_UTIL;
    doc.text(celdas[i] ?? '', x, arriba, { width: ancho - ESPACIO, align: columna.alinear });
    x += ancho;
  });
  const abajo = arriba + alto + ESPACIO / 2;
  doc.moveTo(HOJA.margen, abajo).lineTo(HOJA.margen + ANCHO_UTIL, abajo).lineWidth(0.5).strokeColor(LINEA).stroke();
  doc.x = HOJA.margen;
  doc.y = abajo + ESPACIO / 2;
}

function altoDe(doc: PDFKit.PDFDocument, celdas: readonly string[]): number {
  return Math.max(...COLUMNAS.map((c, i) => doc.heightOfString(celdas[i] ?? '', { width: c.ancho * ANCHO_UTIL - ESPACIO })));
}
