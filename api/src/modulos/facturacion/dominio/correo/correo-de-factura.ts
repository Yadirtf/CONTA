import { ErrorDominio } from '../../../../compartido/dominio/index.js';

export const ESTADOS_DEL_CORREO = ['pendiente', 'enviado', 'fallido'] as const;
export type EstadoDelCorreo = (typeof ESTADOS_DEL_CORREO)[number];

/** Minutos de espera tras la 1.ª, 2.ª, ... falla. Al pasar la última, el correo queda fallido. */
const ESPERAS_EN_MINUTOS = [1, 5, 15, 60, 180, 360, 720] as const;
export const MAXIMO_DE_INTENTOS_DE_CORREO = ESPERAS_EN_MINUTOS.length + 1;
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

  enviado(): void {
    this.exigirPendiente();
    this.datos = { ...this.datos, estado: 'enviado', intentos: this.datos.intentos + 1, proximoIntentoEn: null, ultimaFalla: null };
  }

  /** Una falla pasajera espera y reintenta; una permanente (dirección rechazada) termina el correo. */
  fallo(codigo: string, permanente: boolean, ahora: Date): void {
    this.exigirPendiente();
    if (!CODIGO_DE_FALLA.test(codigo)) throw new ErrorDominio('correo.falla-invalida', 'El código de la falla no es válido');
    const intentos = this.datos.intentos + 1;
    const espera = ESPERAS_EN_MINUTOS[intentos - 1];
    if (permanente || espera === undefined) {
      this.datos = { ...this.datos, estado: 'fallido', intentos, proximoIntentoEn: null, ultimaFalla: codigo };
      return;
    }
    this.datos = { ...this.datos, intentos, proximoIntentoEn: new Date(ahora.getTime() + espera * 60_000), ultimaFalla: codigo };
  }

  private exigirPendiente(): void {
    if (this.datos.estado !== 'pendiente') {
      throw new ErrorDominio('correo.cerrado', `El correo ya terminó (${this.datos.estado})`);
    }
  }
}
