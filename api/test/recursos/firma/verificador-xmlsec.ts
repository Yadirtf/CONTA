import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Verificador externo de la firma: xmlsec1 (libxmlsec), el mismo con el que se comprobó una factura real
// aceptada por la DIAN. En CI es obligatorio (CI=true); en un equipo sin xmlsec1 la prueba se omite.
// Solo recibe datos públicos: el XML firmado y un certificado de prueba.

export const hayXmlsec = spawnSync('xmlsec1', ['--version'], { encoding: 'utf8' }).status === 0;
export const exigirXmlsec = process.env['CI'] === 'true';

export interface ResultadoDeVerificacion {
  readonly valida: boolean;
  readonly salida: string;
}

/** Factura con firma XAdES: el certificado sale del KeyInfo y debe venir de la CA de prueba. */
export function verificarConXmlsec(xmlFirmado: string, caPem: string): ResultadoDeVerificacion {
  return xmlsec(xmlFirmado, caPem, (documento, pem) => [
    '--trusted-pem',
    pem,
    '--id-attr:Id',
    'http://uri.etsi.org/01903/v1.3.2#:SignedProperties',
    '--id-attr:Id',
    'http://www.w3.org/2000/09/xmldsig#:KeyInfo',
    documento,
  ]);
}

/**
 * Sobre SOAP con firma WS-Security (HU-02.03). xmlsec1 no resuelve la referencia al BinarySecurityToken
 * (KEY-NOT-FOUND), así que el KeyInfo, que no está firmado, se cambia por el mismo certificado en
 * X509Data. Como en la factura, xmlsec1 lo acepta solo si viene de la CA de prueba.
 */
export function verificarSobreConXmlsec(sobreFirmado: string, caPem: string): ResultadoDeVerificacion {
  const token = /<wsse:BinarySecurityToken[^>]*>([^<]+)</.exec(sobreFirmado)?.[1] ?? '';
  const conX509 = sobreFirmado.replace(
    /<ds:KeyInfo>[\s\S]*?<\/ds:KeyInfo>/,
    `<ds:KeyInfo><ds:X509Data><ds:X509Certificate>${token}</ds:X509Certificate></ds:X509Data></ds:KeyInfo>`,
  );
  return xmlsec(conX509, caPem, (documento, pem) => ['--trusted-pem', pem, '--id-attr:Id', 'To', documento]);
}

function xmlsec(xml: string, pem: string, argumentos: (documento: string, pem: string) => string[]): ResultadoDeVerificacion {
  const carpeta = mkdtempSync(join(tmpdir(), 'conta-xmlsec-'));
  try {
    const documento = join(carpeta, 'documento.xml');
    const certificado = join(carpeta, 'certificado.pem');
    writeFileSync(documento, xml);
    writeFileSync(certificado, pem);
    const r = spawnSync('xmlsec1', ['--verify', ...argumentos(documento, certificado)], { encoding: 'utf8' });
    return { valida: r.status === 0, salida: `${r.stdout}${r.stderr}` };
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
}
