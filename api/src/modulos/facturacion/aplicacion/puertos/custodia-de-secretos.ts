/**
 * Guarda y abre los datos reservados de la DIAN (PIN del software y clave técnica, HU-07.04). `asociadoA` ata el
 * secreto a su dueño (empresa y clase, o empresa y resolución): copiado a otra fila, no se abre. Si la clave de
 * cifrado no está configurada, lanza SecretosNoDisponibles: se falla cerrado y nunca se guarda en claro.
 */
export interface CustodiaDeSecretos {
  cifrar(secreto: string, asociadoA: string): string;
  descifrar(cifrado: string, asociadoA: string): string;
  /**
   * Huella con clave (HMAC) de un contenido que puede llevar secretos: sirve para comparar dos pedidos sin guardar
   * ni descifrar el secreto. Misma entrada y mismo dueño, misma huella; sin la clave del servidor no se puede calcular.
   */
  huella(contenido: string, asociadoA: string): string;
}

export const CUSTODIA_DE_SECRETOS = Symbol('CustodiaDeSecretos');

/** Dueño de cada secreto, como dato asociado del cifrado. */
export const asociadoAlSoftware = (empresaId: string, clase: string): string => `conta/software-dian/${empresaId}/${clase}`;
export const asociadoALaResolucion = (empresaId: string, resolucionId: string): string =>
  `conta/resolucion/${empresaId}/${resolucionId}`;
