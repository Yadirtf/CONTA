// Estado de salud de la API. No consulta la base de datos: lo usa el despertador cada 14 minutos
// y la comprobación de salud de Render, y no debe mantener despierto el cómputo de Neon.
export interface EstadoSalud {
  readonly estado: 'ok';
  readonly servicio: 'conta-api';
  readonly version: string;
  readonly hora: string;
}

export function crearEstadoSalud(version: string, hora: Date): EstadoSalud {
  if (version.trim() === '') {
    throw new Error('La versión de la API no puede estar vacía');
  }
  return { estado: 'ok', servicio: 'conta-api', version, hora: hora.toISOString() };
}
