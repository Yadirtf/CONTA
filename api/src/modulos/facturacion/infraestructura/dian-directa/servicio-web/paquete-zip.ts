import { crc32, deflateRawSync } from 'node:zlib';

// ZIP mínimo con un solo archivo comprimido con deflate, como lo pide la DIAN para enviar el XML
// (anexo técnico 1.9, sección 9.2). Formato: PKWARE APPNOTE 6.3, sin cifrado ni ZIP64.

const FIRMA_LOCAL = 0x04034b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_FIN = 0x06054b50;
const VERSION = 20; // 2.0: deflate
const DEFLATE = 8;
const UTF8 = 0x0800; // bit 11: nombre en UTF-8
/** 1980-01-01 00:00: fecha fija para que el mismo XML produzca siempre el mismo ZIP. */
const FECHA_DOS = (0 << 9) | (1 << 5) | 1;

export function zipConUnArchivo(nombre: string, contenido: Buffer): Buffer {
  const nombreBytes = Buffer.from(nombre, 'utf8');
  const comprimido = deflateRawSync(contenido);
  const crc = crc32(contenido);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(FIRMA_LOCAL, 0);
  escribirDatosComunes(local, 4, crc, comprimido.length, contenido.length, nombreBytes.length);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(FIRMA_CENTRAL, 0);
  central.writeUInt16LE(VERSION, 4); // versión con que se creó
  escribirDatosComunes(central, 6, crc, comprimido.length, contenido.length, nombreBytes.length);
  // Comentario, disco, atributos internos y externos en 0; desplazamiento del encabezado local en 0.

  const tamanoCentral = central.length + nombreBytes.length;
  const desplazamientoCentral = local.length + nombreBytes.length + comprimido.length;
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(FIRMA_FIN, 0);
  fin.writeUInt16LE(1, 8); // entradas en este disco
  fin.writeUInt16LE(1, 10); // entradas en total
  fin.writeUInt32LE(tamanoCentral, 12);
  fin.writeUInt32LE(desplazamientoCentral, 16);

  return Buffer.concat([local, nombreBytes, comprimido, central, nombreBytes, fin]);
}

/** Campos que el encabezado local y el central comparten, desde «versión necesaria» hasta «largo del extra». */
function escribirDatosComunes(b: Buffer, desde: number, crc: number, comprimido: number, original: number, nombre: number): void {
  b.writeUInt16LE(VERSION, desde);
  b.writeUInt16LE(UTF8, desde + 2);
  b.writeUInt16LE(DEFLATE, desde + 4);
  b.writeUInt16LE(0, desde + 6); // hora DOS
  b.writeUInt16LE(FECHA_DOS, desde + 8);
  b.writeUInt32LE(crc, desde + 10);
  b.writeUInt32LE(comprimido, desde + 14);
  b.writeUInt32LE(original, desde + 18);
  b.writeUInt16LE(nombre, desde + 22);
  b.writeUInt16LE(0, desde + 24); // largo del campo extra
}
