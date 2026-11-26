import { ErrorDominio } from '../../../compartido/dominio/index.js';

/** Personas vigentes (invitadas o activas) por empresa: alcanza para un negocio con varias cajas. */
export const MAXIMO_DE_MIEMBROS_POR_EMPRESA = 30;

/** Invitaciones por empresa en 24 horas: frena a quien invite celulares ajenos en masa. */
export const MAXIMO_DE_INVITACIONES_POR_DIA = 10;

export const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

export function comprobarQuePuedeInvitar(vigentes: number, invitacionesDelDia: number): void {
  if (vigentes >= MAXIMO_DE_MIEMBROS_POR_EMPRESA) {
    throw new ErrorDominio('miembro.limite', `Una empresa puede tener hasta ${MAXIMO_DE_MIEMBROS_POR_EMPRESA} personas`);
  }
  if (invitacionesDelDia >= MAXIMO_DE_INVITACIONES_POR_DIA) {
    throw new ErrorDominio('miembro.limite-diario', `Puedes invitar hasta ${MAXIMO_DE_INVITACIONES_POR_DIA} personas por día`);
  }
}
