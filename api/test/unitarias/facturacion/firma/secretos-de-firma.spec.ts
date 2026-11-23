import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';
import {
  CertificadoDeFirma,
  TAMANO_MAXIMO_DEL_P12,
} from '../../../../src/modulos/facturacion/aplicacion/firma/certificado-de-firma.js';
import { CONTRASENA_DE_PRUEBA } from '../../../recursos/firma/certificados-de-prueba.js';
import { certificadoDe, facturaSinFirmar, firmador, juegoDeCertificados } from './apoyo.js';

// Criterio de HU-02.02: el certificado se descifra solo en memoria y nunca llega a disco ni a logs.

const juego = juegoDeCertificados();
const base64DelP12 = Buffer.from(juego.p12).toString('base64');

describe('el certificado de firma no se filtra (HU-02.02)', () => {
  it('JSON, util.inspect y String no muestran los bytes ni la contraseña', () => {
    const certificado = certificadoDe(juego);
    const vistas = [
      JSON.stringify({ certificado }),
      inspect({ certificado }, { depth: 10, showHidden: true }),
      String(certificado),
    ];
    for (const vista of vistas) {
      expect(vista).toContain('[CertificadoDeFirma]');
      expect(vista).not.toContain(CONTRASENA_DE_PRUEBA);
      expect(vista).not.toContain(base64DelP12.slice(0, 40));
      expect(vista).not.toMatch(/\b(48|0x30), (130|0x82)/); // inicio DER de un .p12 mostrado como bytes
    }
  });

  it('descartar() borra la copia en memoria y no toca el arreglo de quien lo entregó', () => {
    const original = Uint8Array.from(juego.p12);
    const certificado = CertificadoDeFirma.de(original, CONTRASENA_DE_PRUEBA);
    let copia: Uint8Array | undefined;
    certificado.usar((p12) => (copia = p12));
    certificado.descartar();
    expect(copia?.every((b) => b === 0)).toBe(true);
    expect(original).toEqual(juego.p12);
    expect(() => certificado.usar(() => undefined)).toThrow(/descartado/);
  });

  it('rechaza un archivo vacío o más grande que cualquier .p12 real', () => {
    expect(() => CertificadoDeFirma.de(new Uint8Array(), 'x')).toThrow(RangeError);
    expect(() => CertificadoDeFirma.de(new Uint8Array(TAMANO_MAXIMO_DEL_P12 + 1), 'x')).toThrow(RangeError);
  });

  it('la firma no escribe en consola ni en logs', () => {
    const espias = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m));
    firmador().firmar(facturaSinFirmar().xml, certificadoDe(juego));
    for (const espia of espias) expect(espia).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('el código de la firma no importa el sistema de archivos ni un logger', () => {
    const carpetas = [
      '../../../../src/modulos/facturacion/infraestructura/dian-directa/firma/',
      '../../../../src/modulos/facturacion/aplicacion/firma/',
    ];
    for (const carpeta of carpetas) {
      const ruta = fileURLToPath(new URL(carpeta, import.meta.url));
      for (const archivo of readdirSync(ruta).filter((f) => f.endsWith('.ts'))) {
        const fuente = readFileSync(`${ruta}${archivo}`, 'utf8');
        expect(fuente, archivo).not.toMatch(/from '(node:)?fs(\/promises)?'|from '@nestjs\/common'|console\.|Logger/);
      }
    }
  });
});
