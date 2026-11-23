import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Verificador externo de la firma: xmlsec1 (libxmlsec), el mismo con el que se comprobó una factura real
// aceptada por la DIAN. En CI es obligatorio (CI=true); en un equipo sin xmlsec1 la prueba se omite.
// Solo recibe datos públicos: el XML firmado y el certificado de la CA de prueba.

export const hayXmlsec = spawnSync('xmlsec1', ['--version'], { encoding: 'utf8' }).status === 0;
export const exigirXmlsec = process.env['CI'] === 'true';

export interface ResultadoDeVerificacion {
  readonly valida: boolean;
  readonly salida: string;
}

export function verificarConXmlsec(xmlFirmado: string, caPem: string): ResultadoDeVerificacion {
  const carpeta = mkdtempSync(join(tmpdir(), 'conta-xmlsec-'));
  try {
    const documento = join(carpeta, 'factura.xml');
    const ca = join(carpeta, 'ca.pem');
    writeFileSync(documento, xmlFirmado);
    writeFileSync(ca, caPem);
    const r = spawnSync(
      'xmlsec1',
      [
        '--verify',
        '--trusted-pem',
        ca,
        '--id-attr:Id',
        'http://uri.etsi.org/01903/v1.3.2#:SignedProperties',
        '--id-attr:Id',
        'http://www.w3.org/2000/09/xmldsig#:KeyInfo',
        documento,
      ],
      { encoding: 'utf8' },
    );
    return { valida: r.status === 0, salida: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}
