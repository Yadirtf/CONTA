import type { EstadoApi } from '../dominio/estado-api';

type Fetch = typeof fetch;

// Llama a GET /salud de la API (Render). Con límite de tiempo porque la capa gratuita duerme.
export async function consultarSalud(
  urlApi: string | undefined,
  pedir: Fetch = fetch,
  milisegundos = 8000,
): Promise<EstadoApi> {
  if (!urlApi) return { tipo: 'sin-configurar' };
  try {
    const respuesta = await pedir(new URL('/salud', urlApi), {
      cache: 'no-store',
      signal: AbortSignal.timeout(milisegundos),
    });
    if (!respuesta.ok) return { tipo: 'sin-respuesta' };
    const cuerpo = (await respuesta.json()) as { estado?: unknown; version?: unknown };
    if (cuerpo.estado !== 'ok' || typeof cuerpo.version !== 'string') return { tipo: 'sin-respuesta' };
    return { tipo: 'viva', version: cuerpo.version };
  } catch {
    return { tipo: 'sin-respuesta' };
  }
}
