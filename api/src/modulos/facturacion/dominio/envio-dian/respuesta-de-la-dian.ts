import { ErrorDominio } from '../../../../compartido/dominio/index.js';

/** Resultado de una validación según la respuesta de la DIAN (GetStatusZip). */
export type ResultadoDeValidacion = 'aceptado' | 'rechazado' | 'en-proceso';

const CODIGO_ACEPTADO = '00';
const CODIGO_RECHAZADO = '99';
const MAXIMO_DE_MENSAJES = 200;
const LARGO_MAXIMO = 2000;

/**
 * Lo que la DIAN contestó sobre un documento: código, descripción y mensajes de rechazo o notificación
 * (por ejemplo «Regla: FAD06, Rechazo: ...»). Se guarda tal cual para mostrarlo legible.
 */
export class RespuestaDeLaDian {
  private constructor(
    readonly valida: boolean,
    readonly codigo: string,
    readonly descripcion: string,
    readonly mensajes: readonly string[],
  ) {}

  static de(datos: { valida: boolean; codigo: string; descripcion: string; mensajes: readonly string[] }): RespuestaDeLaDian {
    if (datos.mensajes.length > MAXIMO_DE_MENSAJES) {
      throw new ErrorDominio('envio-dian.respuesta-invalida', 'La respuesta de la DIAN trae demasiados mensajes');
    }
    const recortar = (t: string) => t.trim().slice(0, LARGO_MAXIMO);
    return new RespuestaDeLaDian(
      datos.valida,
      recortar(datos.codigo),
      recortar(datos.descripcion),
      datos.mensajes.map(recortar).filter((m) => m !== ''),
    );
  }

  /** 00 válida es aceptada; 99, o inválida con mensajes, es rechazo; lo demás sigue en validación. */
  get resultado(): ResultadoDeValidacion {
    if (this.valida && this.codigo === CODIGO_ACEPTADO) return 'aceptado';
    if (this.codigo === CODIGO_RECHAZADO || (!this.valida && this.mensajes.length > 0)) return 'rechazado';
    return 'en-proceso';
  }
}
