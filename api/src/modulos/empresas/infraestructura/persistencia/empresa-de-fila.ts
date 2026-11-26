import { IdEmpresa } from '../../../../compartido/dominio/index.js';
import { Empresa } from '../../dominio/empresa.js';

/** Convierte una fila de conta.empresas en la entidad. */
export const empresaDeFila = (fila: { id: string; razonSocial: string }): Empresa =>
  Empresa.crear(IdEmpresa.de(fila.id), fila.razonSocial);
