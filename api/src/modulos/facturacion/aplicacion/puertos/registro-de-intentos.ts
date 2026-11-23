/** Una llamada a la DIAN, tal como ocurrió. Solo se agregan; nunca se editan ni se borran. */
export interface IntentoDeEnvio {
  readonly envioId: string;
  /** 1, 2, 3...: igual a EnvioDian.intentos después del intento. */
  readonly numero: number;
  readonly operacion: 'SendTestSetAsync' | 'GetStatusZip';
  readonly resultado: 'recibido' | 'aceptado' | 'rechazado' | 'en-proceso' | 'falla-de-comunicacion';
  /** Código y descripción de la DIAN, o el motivo de la falla. Sin datos reservados. */
  readonly detalle: string;
  readonly duracionMs: number;
  readonly ocurridoEn: Date;
}

export interface RegistroDeIntentos {
  agregar(intento: IntentoDeEnvio): Promise<void>;
}
