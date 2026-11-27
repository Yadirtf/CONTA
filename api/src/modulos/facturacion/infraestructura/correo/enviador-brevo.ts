import { FallaDeCorreo } from '../../aplicacion/correo/falla-de-correo.js';
import type { CorreoSaliente, EnviadorDeCorreo } from '../../aplicacion/puertos/enviador-de-correo.js';
import type { ConfiguracionDeCorreo } from './configuracion-de-correo.js';

const URL_BREVO = 'https://api.brevo.com/v3/smtp/email';
const LIMITE_MS = 15_000;

/** Lo mínimo de fetch que usa el adaptador: en las pruebas se cambia por un transporte falso. */
export type Transporte = (url: string, opciones: RequestInit) => Promise<Pick<Response, 'status'>>;

/**
 * Correo transaccional con la API de Brevo (capa gratuita, HU-06.08). Un 400 es una dirección o un adjunto que el
 * proveedor no admite (permanente); 401, 403, 429, 5xx, la red y el tiempo agotado se reintentan. El código que se
 * guarda es solo el estado HTTP: nunca el cuerpo de la respuesta, que puede repetir la dirección. Brevo no admite
 * llave de idempotencia: un tiempo agotado después de que el correo salió puede repetirlo (riesgo aceptado).
 */
export class EnviadorBrevo implements EnviadorDeCorreo {
  constructor(
    private readonly configuracion: ConfiguracionDeCorreo,
    private readonly transporte: Transporte = (url, opciones) => fetch(url, opciones),
  ) {}

  async enviar(correo: CorreoSaliente): Promise<void> {
    let estado: number;
    try {
      ({ status: estado } = await this.transporte(URL_BREVO, {
        method: 'POST',
        headers: { 'api-key': this.configuracion.llave, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(cuerpoDe(correo, this.configuracion.remitente)),
        signal: AbortSignal.timeout(LIMITE_MS),
        redirect: 'error',
      }));
    } catch {
      throw new FallaDeCorreo('correo.sin-respuesta', false);
    }
    if (estado >= 200 && estado < 300) return;
    throw new FallaDeCorreo(`correo.http-${estado}`, estado === 400);
  }
}

function cuerpoDe(correo: CorreoSaliente, remitente: string) {
  return {
    sender: { name: correo.nombreDelRemitente.slice(0, 70), email: remitente },
    to: [{ email: correo.para }],
    ...(correo.responderA ? { replyTo: { email: correo.responderA } } : {}),
    subject: correo.asunto.slice(0, 200),
    textContent: correo.texto,
    attachment: correo.adjuntos.map((a) => ({ name: a.nombre, content: Buffer.from(a.contenido).toString('base64') })),
  };
}
