import { IdEmpresa } from '../../../src/compartido/dominio/index.js';
import type { PeticionHttp, ResolutorDeEmpresa } from '../../../src/compartido/presentacion/empresa/index.js';

/**
 * Resolutor SOLO para pruebas: toma la empresa de un encabezado. Vive en test/, fuera de src/, así que
 * nunca se compila ni se despliega. En producción la empresa sale de la identidad (EP-04).
 */
export const ENCABEZADO_DE_PRUEBA = 'x-empresa-de-prueba';

export class ResolutorDePrueba implements ResolutorDeEmpresa {
  resolver(peticion: PeticionHttp) {
    const valor = peticion.headers[ENCABEZADO_DE_PRUEBA];
    return typeof valor === 'string' ? { empresaId: IdEmpresa.de(valor) } : null;
  }
}
