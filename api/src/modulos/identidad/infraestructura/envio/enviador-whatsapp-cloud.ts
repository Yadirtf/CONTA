import { type EnviadorDeCodigos, FallaDeEnvio } from '../../aplicacion/puertos/enviador-de-codigos.js';
import type { Celular } from '../../dominio/index.js';
import type { ConfiguracionDeWhatsApp } from '../configuracion/configuracion-de-acceso.js';

const API_DE_META = 'https://graph.facebook.com/v23.0';
const LIMITE_MS = 10_000;

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Envía el código con una plantilla de autenticación de WhatsApp Cloud API (ADR-0010). La plantilla la aprueba
 * Meta: lleva el código en el cuerpo, el botón «Copiar código» y el aviso de no compartirlo.
 * Si Meta no responde 2xx en 10 s, lanza FallaDeEnvio con el estado HTTP; nunca con el cuerpo, que repite el código.
 */
export class EnviadorWhatsAppCloud implements EnviadorDeCodigos {
  constructor(
    private readonly config: ConfiguracionDeWhatsApp,
    private readonly pedir: Fetch = (url, init) => fetch(url, init),
  ) {}

  async enviar(celular: Celular, codigo: string): Promise<void> {
    let respuesta: Response;
    try {
      respuesta = await this.pedir(`${API_DE_META}/${this.config.idDelNumero}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.config.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(this.mensaje(celular, codigo)),
        signal: AbortSignal.timeout(LIMITE_MS),
      });
    } catch {
      throw new FallaDeEnvio('WhatsApp no respondió');
    }
    if (!respuesta.ok) throw new FallaDeEnvio(`WhatsApp respondió ${respuesta.status}`);
  }

  private mensaje(celular: Celular, codigo: string) {
    const parametro = [{ type: 'text', text: codigo }];
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: celular.e164.slice(1),
      type: 'template',
      template: {
        name: this.config.plantilla,
        language: { code: this.config.idioma },
        components: [
          { type: 'body', parameters: parametro },
          { type: 'button', sub_type: 'url', index: '0', parameters: parametro },
        ],
      },
    };
  }
}
