import { ErrorDominio, IdEmpresa } from '../../../../compartido/dominio/index.js';

/**
 * Lee la empresa que la petición dice elegir en el encabezado X-Empresa.
 * 'ausente' si no viene; null si viene mal escrita (se trata igual que una empresa ajena: 404).
 */
export function empresaElegida(valor: string | string[] | undefined): IdEmpresa | null | 'ausente' {
  if (valor === undefined || valor === '') return 'ausente';
  if (typeof valor !== 'string') return null;
  try {
    return IdEmpresa.de(valor);
  } catch (error) {
    if (error instanceof ErrorDominio) return null;
    throw error;
  }
}
