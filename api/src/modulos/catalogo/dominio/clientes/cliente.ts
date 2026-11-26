import { ErrorDominio, Identificacion, type TipoDeIdentificacion } from '../../../../compartido/dominio/index.js';
import { correoDe, type Direccion, direccionDe, textoLimpio } from './contacto.js';
import { esConsumidorFinal } from './consumidor-final.js';
import { datosTributarios, type DatosTributarios, type TipoDePersona } from './datos-tributarios.js';
import { digitoEscritoEn, numeroDeDocumentoLimpio } from './numero-de-documento.js';

const LARGO_MAXIMO_DEL_NOMBRE = 450;

/** Lo que llega para crear un comprador, ya leído por la presentación pero sin validar. */
export interface DatosDeClienteNuevo {
  readonly id: string;
  readonly tipoDeIdentificacion: TipoDeIdentificacion;
  readonly numero: string;
  /** El dígito que escribió la persona, si escribió uno; se compara con el calculado. */
  readonly digitoEscrito: number | null;
  readonly nombre: string;
  readonly tipoDePersona: TipoDePersona;
  readonly responsabilidadesFiscales: readonly string[];
  readonly responsableDeIva: boolean;
  readonly correo: string | null;
  readonly direccion: Direccion | null;
}

export interface DatosDeCliente extends DatosTributarios {
  readonly id: string;
  readonly identificacion: Identificacion;
  /** Nombre de la persona o razón social de la empresa, como va en la factura. */
  readonly nombre: string;
  readonly correo: string | null;
  readonly direccion: Direccion | null;
  readonly creadoEn: Date;
  readonly creadoPor: string;
}

/**
 * Comprador de una empresa (HU-05.01): los campos mínimos que la DIAN pide del adquirente. Las facturas copian
 * estos datos al emitirse, así que cambiar un cliente nunca cambia un documento ya enviado.
 */
export class Cliente {
  private constructor(readonly datos: DatosDeCliente) {}

  static crear(nuevo: DatosDeClienteNuevo, creadoPor: string, ahora: Date): Cliente {
    // «900.373.076-4» también sirve: se limpia y el dígito después del guion se compara como uno escrito.
    const digito = nuevo.digitoEscrito ?? digitoEscritoEn(nuevo.numero);
    const numero = numeroDeDocumentoLimpio(nuevo.numero);
    const identificacion = Identificacion.conDigitoEscrito(nuevo.tipoDeIdentificacion, numero, digito);
    if (esConsumidorFinal(identificacion)) {
      throw new ErrorDominio('cliente.consumidor-final', 'Ese documento es el de consumidor final: elige la opción «Consumidor final»');
    }
    const nombre = textoLimpio(nuevo.nombre);
    if (nombre.length === 0 || nombre.length > LARGO_MAXIMO_DEL_NOMBRE) {
      throw new ErrorDominio('cliente.nombre-invalido', `El nombre tiene de 1 a ${LARGO_MAXIMO_DEL_NOMBRE} caracteres`);
    }
    return new Cliente({
      id: nuevo.id,
      identificacion,
      nombre,
      ...datosTributarios(nuevo),
      correo: correoDe(nuevo.correo),
      direccion: direccionDe(nuevo.direccion),
      creadoEn: ahora,
      creadoPor,
    });
  }

  /** Cliente leído de la base: ya se validó al crearlo. */
  static guardado(datos: DatosDeCliente): Cliente {
    return new Cliente(datos);
  }

  get id(): string {
    return this.datos.id;
  }

  get identificacion(): Identificacion {
    return this.datos.identificacion;
  }
}
