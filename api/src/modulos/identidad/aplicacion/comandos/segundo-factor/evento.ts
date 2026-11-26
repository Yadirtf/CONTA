import type { SesionConUsuario } from '../../puertos/repositorios-de-identidad.js';
import type { EventoDeSegundoFactor, TipoDeEventoDeSegundoFactor } from '../../puertos/registro-de-segundo-factor.js';

/** Arma el evento que se anota para esa sesión. */
export function eventoDe(
  tipo: TipoDeEventoDeSegundoFactor,
  { sesion, usuario }: SesionConUsuario,
  id: string,
  ocurridoEn: Date,
): EventoDeSegundoFactor {
  return { id, usuarioId: usuario.id, sesionId: sesion.id, tipo, ocurridoEn };
}

/** Tipo de evento de un intento fallido: el que bloquea se distingue de los demás. */
export const tipoDelFallo = (codigo: string): TipoDeEventoDeSegundoFactor =>
  codigo === 'segundo-factor.bloqueado' ? 'bloqueado' : 'fallo';
