import { createPrivateKey, X509Certificate } from 'node:crypto';
import forge from 'node-forge';
import { CertificadoNoUtilizable } from '../../../aplicacion/firma/errores-de-firma.js';
import type { AtributoDeNombre, MaterialDeFirma } from './material-de-firma.js';

// Abre el .p12 en memoria. Es el único archivo que usa node-forge (Node no lee PKCS#12, y los .p12 de las
// entidades certificadoras colombianas suelen venir cifrados con 3DES o RC2, que WebCrypto no soporta).
// Cualquier falla se vuelve un CertificadoNoUtilizable sin el error original, que podría llevar datos secretos.

const BOLSA_DE_LLAVE = [forge.pki.oids['pkcs8ShroudedKeyBag'], forge.pki.oids['keyBag']] as const;

export function leerPkcs12(p12: Uint8Array, contrasena: string): MaterialDeFirma {
  let pfx: forge.pkcs12.Pkcs12Pfx;
  try {
    const der = forge.util.createBuffer(Buffer.from(p12.buffer, p12.byteOffset, p12.byteLength).toString('binary'));
    pfx = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(der), false, contrasena);
  } catch {
    throw new CertificadoNoUtilizable('ilegible');
  }

  const llave = llavePrivada(pfx);
  const certificados = bolsas(pfx, forge.pki.oids['certBag']).flatMap((b) => (b.cert ? [b.cert] : []));
  const propio = certificados.find((c) => aX509(c).checkPrivateKey(llave));
  if (!propio) throw new CertificadoNoUtilizable('sin-llave');

  return {
    llave,
    certificado: aX509(propio),
    cadena: certificados.filter((c) => c !== propio).map(aX509),
    emisor: propio.issuer.attributes.map(atributo),
    usos: usosDeLlave(propio),
  };
}

function llavePrivada(pfx: forge.pkcs12.Pkcs12Pfx): ReturnType<typeof createPrivateKey> {
  const llaves = BOLSA_DE_LLAVE.flatMap((tipo) => bolsas(pfx, tipo)).flatMap((b) => (b.key ? [b.key] : []));
  if (llaves.length !== 1) throw new CertificadoNoUtilizable('sin-llave');
  const pkcs8 = Buffer.from(
    forge.asn1.toDer(forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(llaves[0]!))).getBytes(),
    'binary',
  );
  try {
    return createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
  } catch {
    throw new CertificadoNoUtilizable('sin-llave');
  } finally {
    pkcs8.fill(0);
  }
}

function bolsas(pfx: forge.pkcs12.Pkcs12Pfx, tipo: string | undefined): forge.pkcs12.Bag[] {
  if (tipo === undefined) return [];
  return pfx.getBags({ bagType: tipo })[tipo] ?? [];
}

function aX509(certificado: forge.pki.Certificate): X509Certificate {
  return new X509Certificate(
    Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(certificado)).getBytes(), 'binary'),
  );
}

function atributo(a: forge.pki.CertificateField): AtributoDeNombre {
  return { tipo: a.shortName ?? a.type ?? '', valor: String(a.value) };
}

function usosDeLlave(certificado: forge.pki.Certificate): MaterialDeFirma['usos'] {
  const extension: { digitalSignature?: boolean; nonRepudiation?: boolean } | undefined =
    certificado.getExtension('keyUsage');
  if (!extension) return null;
  return {
    firmaDigital: extension.digitalSignature === true,
    noRepudio: extension.nonRepudiation === true,
  };
}
