import { generateKeyPairSync } from 'node:crypto';
import forge from 'node-forge';

// Certificados ficticios, creados en memoria en cada corrida: una CA de prueba y un certificado de firma
// emitido por ella, empaquetados en un .p12. Nunca se guardan en el repositorio ni en disco.

export const CONTRASENA_DE_PRUEBA = 'contraseña-de-prueba-ñ';

export interface OpcionesDeCertificado {
  readonly desde?: Date;
  readonly hasta?: Date;
  readonly noRepudio?: boolean;
  readonly bits?: number;
  readonly cifrado?: '3des' | 'aes256';
}

export interface JuegoDeCertificados {
  readonly p12: Uint8Array;
  /** PEM de la CA de prueba, para que el verificador externo confíe en ella. */
  readonly caPem: string;
  readonly certificadoPem: string;
}

const UN_DIA = 24 * 60 * 60 * 1000;

export function juegoDeCertificados(opciones: OpcionesDeCertificado = {}): JuegoDeCertificados {
  const ca = parDeLlaves(2048);
  const firmante = parDeLlaves(opciones.bits ?? 2048);
  const nombreCa = [
    { shortName: 'C', value: 'CO' },
    { shortName: 'O', value: 'Entidad Certificadora de Prueba, S.A.' },
    { shortName: 'CN', value: 'CA de Prueba CONTA' },
  ];
  const certificadoCa = certificado(ca.publico, ca.privado, nombreCa, nombreCa, '01', {
    desde: new Date(Date.now() - 365 * UN_DIA),
    hasta: new Date(Date.now() + 365 * UN_DIA),
    esCa: true,
    noRepudio: false,
  });
  const certificadoFirmante = certificado(
    firmante.publico,
    ca.privado,
    [
      { shortName: 'C', value: 'CO' },
      { shortName: 'O', value: 'Ferretería & Cía. de Prueba S.A.S.' },
      { shortName: 'CN', value: 'Ferretería de Prueba' },
    ],
    nombreCa,
    '0a1b2c3d4e5f',
    {
      desde: opciones.desde ?? new Date(Date.now() - 30 * UN_DIA),
      hasta: opciones.hasta ?? new Date(Date.now() + 30 * UN_DIA),
      esCa: false,
      noRepudio: opciones.noRepudio ?? true,
    },
  );
  const asn1 = forge.pkcs12.toPkcs12Asn1(firmante.privado, [certificadoFirmante, certificadoCa], CONTRASENA_DE_PRUEBA, {
    algorithm: opciones.cifrado ?? '3des',
  });
  return {
    p12: Uint8Array.from(Buffer.from(forge.asn1.toDer(asn1).getBytes(), 'binary')),
    caPem: forge.pki.certificateToPem(certificadoCa),
    certificadoPem: forge.pki.certificateToPem(certificadoFirmante),
  };
}

function parDeLlaves(bits: number): {
  publico: forge.pki.PublicKey;
  privado: forge.pki.rsa.PrivateKey;
} {
  // node:crypto genera la llave mucho más rápido que node-forge.
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: bits,
  });
  return {
    publico: forge.pki.publicKeyFromPem(publicKey.export({ type: 'spki', format: 'pem' }).toString()),
    privado: forge.pki.privateKeyFromPem(privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()),
  };
}

function certificado(
  publico: forge.pki.PublicKey,
  firmadoCon: forge.pki.rsa.PrivateKey,
  sujeto: forge.pki.CertificateField[],
  emisor: forge.pki.CertificateField[],
  serie: string,
  { desde, hasta, esCa, noRepudio }: { desde: Date; hasta: Date; esCa: boolean; noRepudio: boolean },
): forge.pki.Certificate {
  const c = forge.pki.createCertificate();
  c.publicKey = publico;
  c.serialNumber = serie;
  c.validity.notBefore = desde;
  c.validity.notAfter = hasta;
  c.setSubject(sujeto);
  c.setIssuer(emisor);
  c.setExtensions([
    { name: 'basicConstraints', cA: esCa },
    esCa
      ? { name: 'keyUsage', keyCertSign: true, cRLSign: true }
      : { name: 'keyUsage', digitalSignature: true, nonRepudiation: noRepudio },
  ]);
  c.sign(firmadoCon, forge.md.sha256.create());
  return c;
}
