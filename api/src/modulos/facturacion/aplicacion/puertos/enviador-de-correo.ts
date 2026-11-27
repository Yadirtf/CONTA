/** Un archivo adjunto del correo. */
export interface Adjunto {
  readonly nombre: string;
  readonly tipo: 'application/pdf' | 'application/xml';
  readonly contenido: Uint8Array;
}

/** El correo listo para salir. No lleva secretos; la llave del proveedor la tiene el adaptador. */
export interface CorreoSaliente {
  readonly para: string;
  /** El correo del negocio, para que el comprador le responda a él y no a CONTA. */
  readonly responderA: string | null;
  readonly nombreDelRemitente: string;
  readonly asunto: string;
  readonly texto: string;
  readonly adjuntos: readonly Adjunto[];
  /** Igual para todos los intentos del mismo correo: el proveedor que lo admita lo usa para no repetirlo. */
  readonly idempotencia: string;
}

/**
 * Proveedor de correo (HU-06.08). Si no sale, lanza FallaDeCorreo: permanente si el proveedor rechaza la dirección,
 * pasajera en los demás casos. Cambiar de proveedor es escribir otro adaptador de este puerto.
 */
export interface EnviadorDeCorreo {
  enviar(correo: CorreoSaliente): Promise<void>;
}

export const ENVIADOR_DE_CORREO = Symbol('EnviadorDeCorreo');
