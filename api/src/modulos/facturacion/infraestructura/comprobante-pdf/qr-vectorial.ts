import qrcode from 'qrcode-generator';
import { TEXTO } from './hoja.js';

/** Lo mínimo del documento de pdfkit que necesita el QR: rectángulos rellenos. */
export interface LienzoDelQr {
  rect(x: number, y: number, ancho: number, alto: number): this;
  fill(color: string): this;
}

/**
 * Dibuja el QR del anexo (11.7.1) con rectángulos vectoriales: nítido a cualquier zoom y sin imágenes. Corrección
 * de errores M, la que admite una impresión con manchas sin crecer demasiado.
 */
export function dibujarQr(lienzo: LienzoDelQr, texto: string, x: number, y: number, lado: number): void {
  const qr = qrcode(0, 'M');
  qr.addData(texto, 'Byte');
  qr.make();
  const modulos = qr.getModuleCount();
  const tamano = lado / modulos;
  for (let fila = 0; fila < modulos; fila++) {
    for (let columna = 0; columna < modulos; columna++) {
      if (qr.isDark(fila, columna)) lienzo.rect(x + columna * tamano, y + fila * tamano, tamano, tamano);
    }
  }
  lienzo.fill(TEXTO);
}
