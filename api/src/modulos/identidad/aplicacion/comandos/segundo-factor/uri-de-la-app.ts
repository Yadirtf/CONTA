import type { Celular } from '../../../dominio/index.js';

const EMISOR = 'CONTA';

/**
 * Enlace otpauth:// (formato de Google Authenticator) que la app muestra como QR. La etiqueta lleva el celular
 * enmascarado, para que la persona reconozca la cuenta sin que el número completo quede en otra app.
 */
export function uriDeLaApp(secreto: string, celular: Celular): string {
  const etiqueta = encodeURIComponent(`${EMISOR}:${celular.enmascarado()}`);
  return `otpauth://totp/${etiqueta}?secret=${secreto}&issuer=${EMISOR}&algorithm=SHA1&digits=6&period=30`;
}
