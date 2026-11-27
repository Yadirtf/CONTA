import { CorreoDeFactura } from '../../dominio/index.js';
import type { AvisosDeAceptacion } from '../puertos/avisos-de-aceptacion.js';
import type { RepositorioDeCorreos } from '../puertos/repositorio-de-correos.js';
import type { RepositorioDeVentas } from '../puertos/repositorio-de-ventas.js';

/**
 * HU-06.08: cuando la DIAN acepta la factura de una venta cuyo comprador tiene correo, deja pedido el correo en la
 * misma transacción que guarda la aceptación (bandeja de salida): se confirman juntos o no ocurre ninguno.
 */
export class CorreoAlAceptar implements AvisosDeAceptacion {
  constructor(
    private readonly ventas: Pick<RepositorioDeVentas, 'deEnvio'>,
    private readonly correos: Pick<RepositorioDeCorreos, 'solicitar'>,
  ) {}

  async documentoAceptado(envioId: string, ahora: Date): Promise<boolean> {
    const guardada = await this.ventas.deEnvio(envioId);
    if (!guardada?.venta.datos.comprador.correo) return false;
    await this.correos.solicitar(CorreoDeFactura.solicitar(guardada.venta.id, ahora));
    return true;
  }
}
