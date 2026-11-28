import type { ContextoEmpresa, UnidadDeTrabajo } from '../../../../compartido/aplicacion/index.js';
import type { RepositoriosDeConfiguracion, SoftwareGuardado } from '../../aplicacion/puertos/repositorios-de-configuracion.js';
import type { ClaseDeDocumento, Participante } from '../../dominio/index.js';

export interface SoftwareDeLaEmpresa {
  readonly software: SoftwareGuardado | null;
  readonly facturador: Participante | null;
}

/** Lee en una transacción de la empresa (RLS) su software de la clase y su facturador (HU-07.04). */
export function leerSoftware(
  unidadDeTrabajo: UnidadDeTrabajo<Pick<RepositoriosDeConfiguracion, 'software' | 'datosFiscales'>>,
  contexto: ContextoEmpresa,
  clase: ClaseDeDocumento,
): Promise<SoftwareDeLaEmpresa> {
  return unidadDeTrabajo.ejecutar(contexto, async ({ software, datosFiscales }) => ({
    software: await software.de(clase),
    facturador: await datosFiscales.leer(),
  }));
}
