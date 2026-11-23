import { DOMParser } from '@xmldom/xmldom';
import { FallaDeComunicacionDian } from '../../../aplicacion/envio/falla-de-comunicacion-dian.js';
import type { AcuseDeRecibo } from '../../../aplicacion/puertos/servicio-web-dian.js';
import { RespuestaDeLaDian } from '../../../dominio/index.js';

// Lee las respuestas SOAP de la DIAN por nombre local: los prefijos (b:, c:, s:) cambian entre respuestas.
// Un Fault o una respuesta sin la forma esperada es una falla de comunicación (se reintenta).

export function leerAcuseDeRecibo(xml: string): AcuseDeRecibo {
  const cuerpo = cuerpoDe(xml);
  const zipKey = texto(primero(cuerpo, 'ZipKey'));
  if (zipKey !== '') return { tipo: 'recibido', zipKey };
  const mensajes = todos(cuerpo, 'ProcessedMessage').map(texto);
  if (mensajes.length === 0) throw new FallaDeComunicacionDian('la DIAN no devolvió ZipKey ni mensajes');
  return { tipo: 'rechazado', respuesta: RespuestaDeLaDian.de({ valida: false, codigo: '', descripcion: 'Paquete rechazado al recibirlo', mensajes }) };
}

export function leerRespuestaDeValidacion(xml: string): RespuestaDeLaDian {
  const respuesta = primero(cuerpoDe(xml), 'DianResponse');
  if (!respuesta) throw new FallaDeComunicacionDian('la respuesta no trae DianResponse');
  const errores = primero(respuesta, 'ErrorMessage');
  return RespuestaDeLaDian.de({
    valida: texto(primero(respuesta, 'IsValid')) === 'true',
    codigo: texto(primero(respuesta, 'StatusCode')),
    descripcion: [texto(primero(respuesta, 'StatusDescription')), texto(primero(respuesta, 'StatusMessage'))]
      .filter((t) => t !== '')
      .join(' | '),
    mensajes: errores ? todos(errores, 'string').map(texto) : [],
  });
}

/** Body del sobre; si es un Fault, lanza con su texto (la DIAN no pone datos reservados ahí). */
function cuerpoDe(xml: string): Element {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new FallaDeComunicacionDian('respuesta con DTD');
  const fallar = (): never => {
    throw new FallaDeComunicacionDian('respuesta que no es XML');
  };
  const documento = new DOMParser({ errorHandler: { warning: () => undefined, error: fallar, fatalError: fallar } }).parseFromString(
    xml,
    'text/xml',
  );
  const cuerpo = primero(documento.documentElement, 'Body');
  if (!cuerpo) throw new FallaDeComunicacionDian('respuesta sin Body');
  const falla = primero(cuerpo, 'Fault');
  if (falla) {
    const razon = texto(primero(falla, 'Text')) || texto(primero(falla, 'Value')) || 'sin detalle';
    throw new FallaDeComunicacionDian(`SOAP Fault: ${razon.slice(0, 300)}`);
  }
  return cuerpo;
}

function todos(padre: Element | null, nombre: string): Element[] {
  if (!padre) return [];
  return Array.from(padre.getElementsByTagNameNS('*', nombre));
}

function primero(padre: Element | null, nombre: string): Element | null {
  return todos(padre, nombre)[0] ?? null;
}

function texto(elemento: Element | null): string {
  return elemento?.textContent?.trim() ?? '';
}
