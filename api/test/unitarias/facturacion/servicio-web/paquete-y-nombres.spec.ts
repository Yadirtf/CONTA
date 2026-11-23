import { inflateRawSync } from 'node:zlib';
import { nombresDelPaquete } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/servicio-web/nombres-de-archivo.js';
import { zipConUnArchivo } from '../../../../src/modulos/facturacion/infraestructura/dian-directa/servicio-web/paquete-zip.js';

describe('nombres de archivo del anexo 9.2 (HU-02.03)', () => {
  it('NIT en 10 dígitos, 000 de software propio, año en 2 dígitos y consecutivo hexadecimal de 8', () => {
    expect(nombresDelPaquete({ nitEmisor: '900373076', anio: 2026, consecutivo: 26 })).toEqual({
      xml: 'fv090037307600026' + '0000001A.xml',
      zip: 'z090037307600026' + '0000001A.zip',
    });
  });

  it('rechaza NIT o consecutivo fuera de rango', () => {
    expect(() => nombresDelPaquete({ nitEmisor: '12345678901', anio: 2026, consecutivo: 1 })).toThrow();
    expect(() => nombresDelPaquete({ nitEmisor: '900373076', anio: 2026, consecutivo: 0 })).toThrow();
  });
});

describe('ZIP con un archivo (HU-02.03)', () => {
  const contenido = Buffer.from('<Invoice>Ferretería & Cía.</Invoice>', 'utf8');
  const zip = zipConUnArchivo('fv0900373076000260000001A.xml', contenido);

  it('tiene el encabezado local, el directorio central y el fin, en ese orden', () => {
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    const fin = zip.length - 22;
    expect(zip.readUInt32LE(fin)).toBe(0x06054b50);
    expect(zip.readUInt32LE(zip.readUInt32LE(fin + 16))).toBe(0x02014b50);
  });

  it('el contenido comprimido con deflate se recupera igual', () => {
    const largoNombre = zip.readUInt16LE(26);
    const comprimido = zip.readUInt32LE(18);
    expect(inflateRawSync(zip.subarray(30 + largoNombre, 30 + largoNombre + comprimido))).toEqual(contenido);
    expect(zip.subarray(30, 30 + largoNombre).toString()).toBe('fv0900373076000260000001A.xml');
  });

  it('el mismo XML produce siempre el mismo ZIP', () => {
    expect(zipConUnArchivo('a.xml', contenido)).toEqual(zipConUnArchivo('a.xml', contenido));
  });
});
