import { ErrorDominio } from '../../../../compartido/dominio/index.js';

export const ESTADOS_DEL_CORREO = ['pendiente', 'enviado', 'fallido'] as const;
export type EstadoDelCorreo = (typeof ESTADOS_DEL_CORREO)[number];

/** Minutos de espera tras la 1.ª, 2.ª, ... falla. Al pasar la última, el correo queda fallido. */
const ESPERAS_EN_MINUTOS = [1, 5, 15, 60, 180, 360, 720] as const;
export const MAXIMO_DE_INTENTOS_DE_CORREO = ESPERAS_EN_MINUTOS.length + 1;
/** Tras el último intento, si nadie lo cierra, se espera esto antes de darlo por fallido. */
const ESPERA_MAXIMA = 720;
/** Código de un intento tomado que todavía no se cerró. */
export const INTENTO_EN_CURSO = 'correo.en-curso';
const CODIGO_DE_FALLA = /^[a-z0-9.-]{1,64}$/;

export interface DatosDelCorreo {
  readonly ventaId: string;
  readonly estado: EstadoDelCorreo;
  /** Intentos hechos; sirve también de versión para escrituras concurrentes. */
  readonly intentos: number;
  readonly proximoIntentoEn: Date | null;
  /** Código de la última falla (nunca el mensaje del proveedor ni el correo del comprador). */
  readonly ultimaFalla: string | null;
}

/**
 * El correo con la factura para el comprador (HU-06.08). Se pide una sola vez por venta, cuando la DIAN la acepta,
 * y se reintenta con espera creciente. No guarda la dirección: sale de la venta, que no cambia.
 */
export class CorreoDeFactura {
  private constructor(private datos: DatosDelCorreo) {}

  static solicitar(ventaId: string, ahora: Date): CorreoDeFactura {
    return new CorreoDeFactura({ ventaId, estado: 'pendiente', intentos: 0, proximoIntentoEn: ahora, ultimaFalla: null });
  }

  static reconstituir(datos: DatosDelCorreo): CorreoDeFactura {
    return new CorreoDeFactura(datos);
  }

  instantanea(): DatosDelCorreo {
    return this.datos;
  }

  get ventaId(): string {
    return this.datos.ventaId;
  }

  get intentos(): number {
    return this.datos.intentos;
  }

  tocaEnviar(ahora: Date): boolean {
    return this.datos.estado === 'pendiente' && this.datos.proximoIntentoEn !== null && this.datos.proximoIntentoEn <= ahora;
  }

  /** true si un intento quedó tomado y nadie guardó cómo terminó (el proceso se cayó tras llamar al proveedor). */
  get intentoSinCerrar(): boolean {
    return this.datos.estado === 'pendiente' && this.datos.ultimaFalla === INTENTO_EN_CURSO;
  }

  /**
   * Toma un intento ANTES de llamar al proveedor (hallazgos H2 y H4 de la prueba de ataque): el intento ya cuenta y
   * el próximo queda en el futuro, así que otro procesador no lo vuelve a tomar y un proceso que se cae después de
   * enviar no lo reintenta sin tope. Se cierra con enviado() o fallo().
   */
  iniciarIntento(ahora: Date): void {
    this.exigirPendiente();
    if (this.intentoSinCerrar) throw new ErrorDominio('correo.intento-abierto', 'El intento anterior no se cerró');
    const intentos = this.datos.intentos + 1;
    const espera = ESPERAS_EN_MINUTOS[intentos - 1] ?? ESPERA_MAXIMA;
    this.datos = { ...this.datos, intentos, proximoIntentoEn: new Date(ahora.getTime() + espera * 60_000), ultimaFalla: INTENTO_EN_CURSO };
  }

  enviado(): void {
    this.exigirIntentoAbierto();
    this.datos = { ...this.datos, estado: 'enviado', proximoIntentoEn: null, ultimaFalla: null };
  }

  /**
   * Cierra el intento con una falla. Una pasajera deja la espera que fijó iniciarIntento; una permanente (dirección
   * rechazada) o la del último intento terminan el correo.
   */
  fallo(codigo: string, permanente: boolean): void {
    this.exigirIntentoAbierto();
    if (!CODIGO_DE_FALLA.test(codigo) || codigo === INTENTO_EN_CURSO) {
      throw new ErrorDominio('correo.falla-invalida', 'El código de la falla no es válido');
    }
    if (permanente || this.datos.intentos >= MAXIMO_DE_INTENTOS_DE_CORREO) {
      this.datos = { ...this.datos, estado: 'fallido', proximoIntentoEn: null, ultimaFalla: codigo };
      return;
    }
    this.datos = { ...this.datos, ultimaFalla: codigo };
  }

  get estado(): EstadoDelCorreo {
    return this.datos.estado;
  }

  private exigirIntentoAbierto(): void {
    if (!this.intentoSinCerrar) throw new ErrorDominio('correo.sin-intento', 'No hay un intento abierto que cerrar');
  }

  private exigirPendiente(): void {
    if (this.datos.estado !== 'pendiente') {
      throw new ErrorDominio('correo.cerrado', `El correo ya terminó (${this.datos.estado})`);
    }
  }
}
