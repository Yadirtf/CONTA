import type { EnvioDian } from '../../dominio/index.js';

/** Lo que se guarda una sola vez al solicitar el envío y nunca se edita (documento enviado a la DIAN). */
export interface DocumentoDelEnvio {
  readonly xmlFirmado: string;
  readonly nitEmisor: string;
  readonly anio: number;
  readonly consecutivo: number;
}

/** Repositorio atado a la transacción de una empresa: solo ve esa empresa (RLS). */
export interface RepositorioDeEnvios {
  buscar(id: string): Promise<EnvioDian | null>;
  buscarPorCufe(cufe: string): Promise<EnvioDian | null>;
  documentoDe(id: string): Promise<DocumentoDelEnvio | null>;
  /** Siguiente consecutivo de archivo del año para la empresa (anexo 9.2). */
  siguienteConsecutivo(anio: number): Promise<number>;
  crear(envio: EnvioDian, documento: DocumentoDelEnvio): Promise<void>;
  /** Guarda el nuevo estado solo si nadie más lo cambió desde `intentosLeidos`. Devuelve false si perdió la carrera. */
  actualizar(envio: EnvioDian, intentosLeidos: number): Promise<boolean>;
}
