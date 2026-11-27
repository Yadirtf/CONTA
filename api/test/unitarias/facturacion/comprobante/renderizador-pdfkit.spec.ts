import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { comprobanteDeVenta } from '../../../../src/modulos/facturacion/dominio/index.js';
import { codigoQrDelXml } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/ubl/codigo-qr-del-xml.js';
import { imprimible } from '../../../../src/modulos/facturacion/infraestructura/comprobante-pdf/hoja.js';
import { dibujarQr } from '../../../../src/modulos/facturacion/infraestructura/comprobante-pdf/qr-vectorial.js';
import { RenderizadorPdfkit } from '../../../../src/modulos/facturacion/infraestructura/comprobante-pdf/renderizador-pdfkit.js';
import { emisorDePrueba } from '../datos-de-prueba.js';
import { CUFE, QR, resolucionDePrueba, ventaDePrueba } from './apoyo.js';

const comprobante = () =>
  comprobanteDeVenta({ venta: ventaDePrueba(), emisor: emisorDePrueba(), resolucion: resolucionDePrueba(), cufe: CUFE, codigoQr: QR });

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const paginas = (pdf: Uint8Array) => (Buffer.from(pdf).toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

/** Texto de los flujos del PDF ya descomprimidos, para buscar lo que se dibujó. */
function contenido(pdf: Uint8Array): string {
  const texto = Buffer.from(pdf).toString('latin1');
  const partes: string[] = [];
  for (const m of texto.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    try {
      partes.push(inflateSync(Buffer.from(m[1] ?? '', 'latin1')).toString('latin1'));
    } catch {
      // Flujos sin comprimir (fuentes): no hacen falta.
    }
  }
  return partes.join('\n');
}

describe('RenderizadorPdfkit (HU-06.08)', () => {
  it('dibuja un PDF de una hoja y siempre igual para la misma venta', async () => {
    const renderizador = new RenderizadorPdfkit();
    const [a, b] = await Promise.all([renderizador.pdf(comprobante()), renderizador.pdf(comprobante())]);
    expect(Buffer.from(a).subarray(0, 5).toString()).toBe('%PDF-');
    expect(sha256(a)).toBe(sha256(b));
    expect(paginas(a)).toBe(1);
    expect(contenido(a)).toMatch(/ re\n/); // los módulos del QR son rectángulos
  });

  it('pasa a otra hoja cuando la venta trae muchas líneas', async () => {
    const base = comprobante();
    const largo = { ...base, lineas: Array.from({ length: 100 }, (_, i) => ({ ...base.lineas[0]!, descripcion: `Producto ${i}` })) };
    expect(paginas(await new RenderizadorPdfkit().pdf(largo))).toBeGreaterThan(1);
  });

  it('cambia por «?» lo que las fuentes estándar no saben escribir y conserva el español', () => {
    expect(imprimible('Café ñandú 🍺 «x»')).toBe('Café ñandú ? «x»');
  });

  it('el QR tiene los módulos de la versión que pide el texto', () => {
    const rectangulos: number[][] = [];
    const lienzo = {
      rect(x: number, y: number, ancho: number, alto: number) {
        rectangulos.push([x, y, ancho, alto]);
        return this;
      },
      fill() {
        return this;
      },
    };
    dibujarQr(lienzo, QR, 0, 0, 100);
    expect(rectangulos.length).toBeGreaterThan(100);
    expect(Math.max(...rectangulos.map(([x, , ancho]) => (x ?? 0) + (ancho ?? 0)))).toBeLessThanOrEqual(100.0001);
  });
});

describe('codigoQrDelXml (HU-06.08)', () => {
  it('lee el QR tal como quedó en el XML firmado y deshace los escapes', () => {
    expect(codigoQrDelXml(`<a><sts:QRCode>${QR}&amp;x=1</sts:QRCode></a>`)).toBe(`${QR}&x=1`);
    expect(() => codigoQrDelXml('<a/>')).toThrow();
  });
});
