import { FallaDeComunicacionDian } from '../../../aplicacion/envio/falla-de-comunicacion-dian.js';
import { PREFIJO_DE_ACCION } from './espacios-soap.js';

// POST del sobre SOAP 1.2. Un 2xx o un 500 con cuerpo (WCF responde los Fault con 500) se entregan para
// leerlos; lo demás, y los errores de red o de tiempo, son fallas de comunicación que se reintentan.

const TIEMPO_MAXIMO_MS = 30_000;
const TAMANO_MAXIMO = 20 * 1024 * 1024;

export type Transporte = (url: string, init: RequestInit) => Promise<Response>;

export async function publicarSobre(
  destino: string,
  operacion: string,
  sobre: string,
  transporte: Transporte = fetch,
): Promise<string> {
  let respuesta: Response;
  try {
    respuesta = await transporte(destino, {
      method: 'POST',
      headers: { 'Content-Type': `application/soap+xml; charset=utf-8; action="${PREFIJO_DE_ACCION}${operacion}"` },
      body: sobre,
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
  } catch (error) {
    const tiempo = error instanceof Error && error.name === 'TimeoutError';
    throw new FallaDeComunicacionDian(tiempo ? 'tiempo de espera agotado' : 'no se pudo conectar');
  }
  const cuerpo = await respuesta.text();
  if (cuerpo.length > TAMANO_MAXIMO) throw new FallaDeComunicacionDian('respuesta demasiado grande');
  if (respuesta.ok || (respuesta.status === 500 && cuerpo.includes('Fault'))) return cuerpo;
  throw new FallaDeComunicacionDian(`HTTP ${respuesta.status}`);
}
