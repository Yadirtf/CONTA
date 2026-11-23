import { createHash } from 'node:crypto';
import { MomentoDeEmision } from '../../../dominio/index.js';
import { el, grupo, serializarFragmento } from '../xml/escritor-xml.js';
import type { IdentificadoresDeFirma } from './identificadores-de-firma.js';
import type { MaterialDeFirma } from './material-de-firma.js';
import { nombreDistinguido } from './nombre-distinguido.js';
import { ALGORITMO, ESPACIO_XADES, POLITICA, type RolDelFirmante } from './politica-de-firma.js';

/**
 * xades:QualifyingProperties de la firma XAdES-EPES (anexo 10.3): hora de la firma, certificado firmante,
 * política de firma de la DIAN, rol del firmante y formato del documento firmado.
 */
export function propiedadesXades(
  ids: IdentificadoresDeFirma,
  material: MaterialDeFirma,
  momento: Date,
  rol: RolDelFirmante,
): string {
  const hora = MomentoDeEmision.desde(momento);
  return serializarFragmento(
    grupo(
      'xades:QualifyingProperties',
      [
        grupo(
          'xades:SignedProperties',
          [
            grupo('xades:SignedSignatureProperties', [
              el('xades:SigningTime', `${hora.fecha}T${hora.hora}`),
              certificadoFirmante(material),
              politicaDeFirma(),
              grupo('xades:SignerRole', [grupo('xades:ClaimedRoles', [el('xades:ClaimedRole', rol)])]),
            ]),
            grupo('xades:SignedDataObjectProperties', [
              grupo('xades:DataObjectFormat', [el('xades:MimeType', 'text/xml'), el('xades:Encoding', 'UTF-8')], {
                ObjectReference: `#${ids.referenciaAlDocumento}`,
              }),
            ]),
          ],
          { Id: ids.propiedadesFirmadas },
        ),
      ],
      {
        'xmlns:xades': ESPACIO_XADES,
        Id: ids.propiedadesCalificantes,
        Target: `#${ids.firma}`,
      },
    ),
  );
}

function certificadoFirmante({ certificado, emisor }: MaterialDeFirma) {
  return grupo('xades:SigningCertificate', [
    grupo('xades:Cert', [
      grupo('xades:CertDigest', [
        el('ds:DigestMethod', '', { Algorithm: ALGORITMO.resumen }),
        el('ds:DigestValue', createHash('sha256').update(certificado.raw).digest('base64')),
      ]),
      grupo('xades:IssuerSerial', [
        el('ds:X509IssuerName', nombreDistinguido(emisor)),
        el('ds:X509SerialNumber', BigInt(`0x${certificado.serialNumber}`).toString()),
      ]),
    ]),
  ]);
}

function politicaDeFirma() {
  return grupo('xades:SignaturePolicyIdentifier', [
    grupo('xades:SignaturePolicyId', [
      grupo('xades:SigPolicyId', [
        el('xades:Identifier', POLITICA.identificador),
        el('xades:Description', POLITICA.descripcion),
      ]),
      grupo('xades:SigPolicyHash', [
        el('ds:DigestMethod', '', { Algorithm: ALGORITMO.resumen }),
        el('ds:DigestValue', POLITICA.resumenSha256),
      ]),
    ]),
  ]);
}
