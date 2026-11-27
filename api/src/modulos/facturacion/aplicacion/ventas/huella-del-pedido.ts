import { type PedidoDeVenta, textoCanonicoDe } from '../../dominio/index.js';

/** SHA-256 en hexadecimal del texto canónico del pedido. Usa la Web Crypto estándar, sin módulos de Node. */
export async function huellaDelPedido(pedido: PedidoDeVenta): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(textoCanonicoDe(pedido)));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}
