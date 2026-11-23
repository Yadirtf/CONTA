// Convenciones de nombres compartidas por los generadores.

export const CABECERA =
  'Generado desde contratos/diseno/tokens.json con herramientas/diseno/tokens.mjs. No se edita a mano.';

/** "sobreAcento" -> "sobre-acento" (CSS). */
export const enGuiones = (nombre) => nombre.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** "sobre-acento" o "sobreAcento" -> "sobreAcento" (Dart). */
export const enCamello = (nombre) => nombre.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
