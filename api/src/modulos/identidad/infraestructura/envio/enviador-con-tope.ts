import { type EnviadorDeCodigos, FallaDeEnvio } from '../../aplicacion/puertos/enviador-de-codigos.js';
import type { Celular } from '../../dominio/index.js';

const HORA_MS = 60 * 60 * 1000;

/**
 * Tope de mensajes por hora para todo CONTA, contra el bombeo de mensajes con muchos números distintos
 * (cada mensaje cuesta). Vive en memoria: con una sola instancia (Render gratis) basta; con varias, cada una
 * tendría su tope y habría que moverlo a la base. Al llegar al tope avisa en el registro, sin el celular.
 */
export class EnviadorConTope implements EnviadorDeCodigos {
  private ventanaDesde = 0;
  private enviados = 0;

  constructor(
    private readonly real: EnviadorDeCodigos,
    private readonly porHora: number,
    private readonly ahora: () => number = Date.now,
  ) {}

  enviar(celular: Celular, codigo: string): Promise<void> {
    const ahora = this.ahora();
    if (ahora - this.ventanaDesde >= HORA_MS) {
      this.ventanaDesde = ahora;
      this.enviados = 0;
    }
    if (this.enviados >= this.porHora) {
      console.warn(`Acceso: se alcanzó el tope de ${this.porHora} códigos por hora`);
      return Promise.reject(new FallaDeEnvio('Tope de envíos por hora'));
    }
    this.enviados += 1;
    return this.real.enviar(celular, codigo);
  }
}
