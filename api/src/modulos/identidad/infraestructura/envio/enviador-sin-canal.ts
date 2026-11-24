import { type EnviadorDeCodigos, FallaDeEnvio } from '../../aplicacion/puertos/enviador-de-codigos.js';

/** Canal por defecto mientras no hay credenciales de WhatsApp: falla cerrado y la API responde 503. */
export class EnviadorSinCanal implements EnviadorDeCodigos {
  enviar(): Promise<void> {
    return Promise.reject(new FallaDeEnvio('No hay canal de envío configurado (WHATSAPP_TOKEN y WHATSAPP_ID_NUMERO)'));
  }
}
