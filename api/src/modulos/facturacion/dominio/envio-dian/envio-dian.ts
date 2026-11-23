import { ErrorDominio } from '../../../../compartido/dominio/index.js';
import { esEstadoFinal, type EstadoDelEnvio } from './estado-del-envio.js';
import { esperaDeConsulta, esperaTrasFalla, MAXIMO_DE_INTENTOS } from './politica-de-reintentos.js';
import type { RespuestaDeLaDian } from './respuesta-de-la-dian.js';

export interface DatosDelEnvio {
  readonly id: string;
  readonly cufe: string;
  readonly numero: string;
  readonly estado: EstadoDelEnvio;
  readonly zipKey: string | null;
  /** Llamadas hechas a la DIAN (envíos y consultas). Sirve también de versión para escrituras concurrentes. */
  readonly intentos: number;
  /** Fallas de comunicación seguidas; vuelve a 0 con cada respuesta de la DIAN. */
  readonly fallasSeguidas: number;
  readonly consultas: number;
  readonly proximoIntentoEn: Date | null;
  readonly respuesta: RespuestaDeLaDian | null;
}

/**
 * Envío de un documento electrónico a la DIAN (HU-02.03): su máquina de estados y cuándo toca el siguiente
 * intento. No sabe de SOAP, colas ni base de datos; la aplicación le cuenta lo que pasó con la DIAN.
 */
export class EnvioDian {
  private constructor(private datos: DatosDelEnvio) {}

  static solicitar(id: string, cufe: string, numero: string, ahora: Date): EnvioDian {
    if (!/^[0-9a-f]{96}$/.test(cufe)) throw new ErrorDominio('envio-dian.cufe-invalido', 'El CUFE no es válido');
    return new EnvioDian({
      id,
      cufe,
      numero,
      estado: 'pendiente',
      zipKey: null,
      intentos: 0,
      fallasSeguidas: 0,
      consultas: 0,
      proximoIntentoEn: ahora,
      respuesta: null,
    });
  }

  static reconstituir(datos: DatosDelEnvio): EnvioDian {
    return new EnvioDian(datos);
  }

  get id(): string {
    return this.datos.id;
  }
  get cufe(): string {
    return this.datos.cufe;
  }
  get estado(): EstadoDelEnvio {
    return this.datos.estado;
  }
  get zipKey(): string | null {
    return this.datos.zipKey;
  }
  get intentos(): number {
    return this.datos.intentos;
  }
  get proximoIntentoEn(): Date | null {
    return this.datos.proximoIntentoEn;
  }
  get respuesta(): RespuestaDeLaDian | null {
    return this.datos.respuesta;
  }
  instantanea(): DatosDelEnvio {
    return this.datos;
  }

  /** ¿Hay que llamar a la DIAN ahora? */
  tocaIntentar(ahora: Date): boolean {
    return !esEstadoFinal(this.datos.estado) && this.datos.proximoIntentoEn !== null && this.datos.proximoIntentoEn <= ahora;
  }

  /** Qué llamada corresponde: enviar el ZIP o consultar su validación. */
  get siguientePaso(): 'enviar' | 'consultar' {
    this.exigirAbierto();
    return this.datos.estado === 'pendiente' ? 'enviar' : 'consultar';
  }

  /** La DIAN recibió el ZIP y devolvió su ZipKey: desde ahora se consulta la validación. */
  recibido(zipKey: string, ahora: Date): void {
    this.exigirEstado('pendiente');
    if (zipKey.trim() === '') throw new ErrorDominio('envio-dian.zipkey-vacio', 'La DIAN no devolvió ZipKey');
    this.datos = {
      ...this.datos,
      estado: 'en-validacion',
      zipKey,
      intentos: this.datos.intentos + 1,
      fallasSeguidas: 0,
      proximoIntentoEn: new Date(ahora.getTime() + esperaDeConsulta(1)),
    };
  }

  /** La DIAN rechazó el paquete al recibirlo (sin ZipKey) o respondió la validación. */
  respondido(respuesta: RespuestaDeLaDian, ahora: Date): void {
    this.exigirAbierto();
    const resultado = this.datos.estado === 'pendiente' && respuesta.resultado === 'en-proceso' ? 'rechazado' : respuesta.resultado;
    const consultas = this.datos.estado === 'en-validacion' ? this.datos.consultas + 1 : this.datos.consultas;
    const intentos = this.datos.intentos + 1;
    if (resultado === 'en-proceso') {
      this.datos = { ...this.datos, intentos, consultas, fallasSeguidas: 0, respuesta };
      this.programar(ahora, esperaDeConsulta(consultas + 1));
      return;
    }
    this.datos = { ...this.datos, estado: resultado, intentos, consultas, fallasSeguidas: 0, respuesta, proximoIntentoEn: null };
  }

  /** No hubo respuesta (red, tiempo agotado, error 5xx): se reintenta con espera exponencial. */
  fallaDeComunicacion(ahora: Date): void {
    this.exigirAbierto();
    const fallasSeguidas = this.datos.fallasSeguidas + 1;
    this.datos = { ...this.datos, intentos: this.datos.intentos + 1, fallasSeguidas };
    this.programar(ahora, esperaTrasFalla(fallasSeguidas));
  }

  private programar(ahora: Date, espera: number): void {
    if (this.datos.intentos >= MAXIMO_DE_INTENTOS) {
      this.datos = { ...this.datos, estado: 'fallido', proximoIntentoEn: null };
      return;
    }
    this.datos = { ...this.datos, proximoIntentoEn: new Date(ahora.getTime() + espera) };
  }

  private exigirAbierto(): void {
    if (esEstadoFinal(this.datos.estado)) {
      throw new ErrorDominio('envio-dian.cerrado', `El envío ya terminó (${this.datos.estado})`);
    }
  }

  private exigirEstado(estado: EstadoDelEnvio): void {
    if (this.datos.estado !== estado) {
      throw new ErrorDominio('envio-dian.estado-invalido', `El envío está ${this.datos.estado}, no ${estado}`);
    }
  }
}
