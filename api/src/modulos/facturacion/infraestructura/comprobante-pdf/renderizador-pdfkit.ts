import PDFDocument from 'pdfkit';
import type { RenderizadorDeComprobante } from '../../aplicacion/puertos/renderizador-de-comprobante.js';
import type { ComprobanteDeVenta } from '../../dominio/index.js';
import { dibujarEncabezado } from './encabezado.js';
import { HOJA } from './hoja.js';
import { dibujarPieFiscal } from './pie-fiscal.js';
import { dibujarLineas } from './tabla-de-lineas.js';

/** Fecha fija de los metadatos: el PDF de la misma venta sale con los mismos bytes cada vez (ADR, HU-06.08). */
const FECHA_FIJA = new Date('2000-01-01T00:00:00Z');

/**
 * El comprobante en PDF con pdfkit (el único archivo que lo conoce como documento). Coordina las tres secciones;
 * cada una vive en su archivo. Sin imágenes ni fuentes externas: Helvetica estándar y un QR vectorial.
 */
export class RenderizadorPdfkit implements RenderizadorDeComprobante {
  pdf(comprobante: ComprobanteDeVenta): Promise<Uint8Array> {
    return new Promise((resolver, rechazar) => {
      const doc = new PDFDocument({
        size: [HOJA.ancho, HOJA.alto],
        margin: HOJA.margen,
        compress: true,
        info: {
          Title: `${comprobante.titulo} ${comprobante.numero}`,
          Author: comprobante.emisor.nombre,
          Producer: 'CONTA',
          Creator: 'CONTA',
          CreationDate: FECHA_FIJA,
          ModDate: FECHA_FIJA,
        },
      });
      const partes: Buffer[] = [];
      doc.on('data', (parte: Buffer) => partes.push(parte));
      doc.on('end', () => resolver(new Uint8Array(Buffer.concat(partes))));
      doc.on('error', rechazar);
      dibujarEncabezado(doc, comprobante);
      dibujarLineas(doc, comprobante.lineas);
      dibujarPieFiscal(doc, comprobante);
      doc.end();
    });
  }
}
