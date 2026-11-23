// Regla de presentación: cómo se muestra el estado de la API de pruebas.
// Sin React ni fetch: se prueba como función pura.
export type EstadoApi =
  | { tipo: 'viva'; version: string }
  | { tipo: 'sin-respuesta' }
  | { tipo: 'sin-configurar' };

export interface MensajeEstado {
  readonly nivel: 'ok' | 'alerta';
  readonly texto: string;
}

export function mensajeDeEstado(estado: EstadoApi): MensajeEstado {
  switch (estado.tipo) {
    case 'viva':
      return { nivel: 'ok', texto: `La API responde (versión ${estado.version}).` };
    case 'sin-respuesta':
      return {
        nivel: 'alerta',
        texto: 'La API no respondió a tiempo. Si estaba dormida en Render tarda cerca de 1 minuto: recarga en un momento.',
      };
    case 'sin-configurar':
      return { nivel: 'alerta', texto: 'Falta NEXT_PUBLIC_API_URL: esta versión no sabe dónde está la API.' };
  }
}
