import { segundoFactorHasta } from '../../../dominio/index.js';
import type { SesionConUsuario } from '../../puertos/repositorios-de-identidad.js';

/** Hasta cuándo vale la verificación que se acaba de anotar en la sesión. */
export function verificadaHasta({ sesion }: SesionConUsuario, ahora: Date): Date {
  return segundoFactorHasta({ ...sesion, verificadaEn: ahora }) ?? ahora;
}
