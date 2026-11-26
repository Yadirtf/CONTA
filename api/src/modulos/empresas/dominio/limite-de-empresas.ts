import { ErrorDominio } from '../../../compartido/dominio/index.js';

/**
 * Empresas que una persona puede llevar. Alcanza para un contador con muchos clientes y frena a quien cree
 * empresas en masa para gastar recursos de la plataforma.
 */
export const MAXIMO_DE_EMPRESAS_POR_PERSONA = 50;

/** Falla si la persona ya lleva el máximo de empresas y no puede crear otra. */
export function comprobarQuePuedeCrearOtra(empresasQueLleva: number): void {
  if (empresasQueLleva >= MAXIMO_DE_EMPRESAS_POR_PERSONA) {
    throw new ErrorDominio('empresa.limite', `Puedes llevar hasta ${MAXIMO_DE_EMPRESAS_POR_PERSONA} empresas`);
  }
}
