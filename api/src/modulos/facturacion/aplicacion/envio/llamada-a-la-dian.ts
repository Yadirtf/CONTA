import type { EnvioDian } from '../../dominio/index.js';
import { CertificadoNoUtilizable } from '../firma/errores-de-firma.js';
import type { IntentoDeEnvio } from '../puertos/registro-de-intentos.js';
import type { DocumentoDelEnvio } from '../puertos/repositorio-de-envios.js';
import type { AccesoDian, ServicioWebDian } from '../puertos/servicio-web-dian.js';
import { AccesoDianNoConfigurado } from './acceso-dian-no-configurado.js';
import { FallaDeComunicacionDian } from './falla-de-comunicacion-dian.js';

/**
 * Hace la llamada que le toca al envío (enviar el ZIP o consultar la validación), aplica el resultado al
 * envío y devuelve el intento para registrarlo. Una falla de comunicación o de certificado no se lanza:
 * cuenta como intento fallido y el envío decide cuándo reintentar.
 */
export async function llamarALaDian(
  envio: EnvioDian,
  documento: DocumentoDelEnvio | null,
  acceso: () => Promise<AccesoDian>,
  servicio: ServicioWebDian,
  ahora: () => Date,
): Promise<IntentoDeEnvio> {
  const inicio = ahora();
  const operacion = envio.siguientePaso === 'enviar' ? 'SendTestSetAsync' : 'GetStatusZip';
  let resultado: IntentoDeEnvio['resultado'];
  let detalle: string;
  try {
    if (operacion === 'SendTestSetAsync') {
      if (!documento) throw new Error('Falta el documento del envío');
      const acuse = await servicio.enviarSetDePruebas({ ...documento }, await acceso());
      if (acuse.tipo === 'recibido') {
        envio.recibido(acuse.zipKey, ahora());
        [resultado, detalle] = ['recibido', `ZipKey ${acuse.zipKey}`];
      } else {
        envio.respondido(acuse.respuesta, ahora());
        [resultado, detalle] = ['rechazado', resumen(acuse.respuesta.codigo, acuse.respuesta.mensajes)];
      }
    } else {
      const respuesta = await servicio.consultarValidacion(envio.zipKey ?? '', await acceso());
      envio.respondido(respuesta, ahora());
      [resultado, detalle] = [respuesta.resultado, resumen(respuesta.codigo, [respuesta.descripcion, ...respuesta.mensajes])];
    }
  } catch (error) {
    envio.fallaDeComunicacion(ahora());
    [resultado, detalle] = ['falla-de-comunicacion', motivoSeguro(error)];
  }
  const fin = ahora();
  return {
    envioId: envio.id,
    numero: envio.intentos,
    operacion,
    resultado,
    detalle,
    duracionMs: Math.max(0, fin.getTime() - inicio.getTime()),
    ocurridoEn: inicio,
  };
}

function resumen(codigo: string, mensajes: readonly string[]): string {
  return [`Código ${codigo || '(vacío)'}`, ...mensajes.filter(Boolean)].join(' | ').slice(0, 2000);
}

/** Solo mensajes propios, que no llevan secretos; de un error ajeno, solo su tipo. */
function motivoSeguro(error: unknown): string {
  if (
    error instanceof FallaDeComunicacionDian ||
    error instanceof CertificadoNoUtilizable ||
    error instanceof AccesoDianNoConfigurado
  ) {
    return error.message;
  }
  return `Error inesperado (${error instanceof Error ? error.name : typeof error})`;
}
