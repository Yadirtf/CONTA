import { el, grupo, serializar, type NodoXml } from '../xml/escritor-xml.js';
import { NS, PREFIJO_DE_ACCION, TOKEN_X509, VIGENCIA_DEL_MENSAJE_MS } from './espacios-soap.js';

// Sobre SOAP 1.2 sin firmar, con WS-Addressing y el encabezado wsse:Security listo para la firma.
// Cada elemento con wsu:Id declara sus propios espacios de nombres: así su forma canónica exclusiva
// es la misma la calcule quien la calcule (el servidor de la DIAN rechaza el mensaje si no coincide).

export const ID_DEL_DESTINO = 'id-destino';
export const ID_DEL_TOKEN = 'id-token-x509';

export interface DatosDelSobre {
  readonly operacion: string;
  readonly destino: string;
  readonly cuerpo: NodoXml;
  readonly certificadoDer: Buffer;
  readonly ahora: Date;
  readonly idDelMensaje: string;
}

export function sobreSinFirmar(d: DatosDelSobre): string {
  return serializar(
    grupo(
      'soap:Envelope',
      [
        grupo('soap:Header', [
          el('wsa:Action', `${PREFIJO_DE_ACCION}${d.operacion}`, { 'xmlns:wsa': NS.wsa }),
          el('wsa:To', d.destino, {
            'xmlns:soap': NS.soap,
            'xmlns:wcf': NS.wcf,
            'xmlns:wsa': NS.wsa,
            'xmlns:wsu': NS.wsu,
            'wsu:Id': ID_DEL_DESTINO,
          }),
          grupo('wsa:ReplyTo', [el('wsa:Address', `${NS.wsa}/anonymous`)], { 'xmlns:wsa': NS.wsa }),
          el('wsa:MessageID', `urn:uuid:${d.idDelMensaje}`, { 'xmlns:wsa': NS.wsa }),
          seguridad(d),
        ]),
        grupo('soap:Body', [d.cuerpo]),
      ],
      { 'xmlns:soap': NS.soap, 'xmlns:wcf': NS.wcf },
    ),
  );
}

/** wsse:Security en el orden estricto: Timestamp, BinarySecurityToken y (después) la firma. */
function seguridad(d: DatosDelSobre): NodoXml {
  return grupo(
    'wsse:Security',
    [
      grupo(
        'wsu:Timestamp',
        [el('wsu:Created', instante(d.ahora)), el('wsu:Expires', instante(new Date(d.ahora.getTime() + VIGENCIA_DEL_MENSAJE_MS)))],
        { 'xmlns:wsu': NS.wsu, 'wsu:Id': 'id-sello-de-tiempo' },
      ),
      el('wsse:BinarySecurityToken', d.certificadoDer.toString('base64'), {
        'xmlns:wsu': NS.wsu,
        'wsu:Id': ID_DEL_TOKEN,
        EncodingType: TOKEN_X509.encodingType,
        ValueType: TOKEN_X509.valueType,
      }),
    ],
    { 'xmlns:wsse': NS.wsse, 'soap:mustUnderstand': '1' },
  );
}

/** UTC con milisegundos: 2026-11-23T20:30:00.000Z. */
function instante(fecha: Date): string {
  return fecha.toISOString();
}
