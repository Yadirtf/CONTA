// Ejemplo que VIOLA las reglas a propósito.
import { Pool } from 'pg';
import { RepositorioPostgres } from '../infraestructura/repositorio-postgres.js';
import { Caja } from '../../caja/dominio/caja.js';

export class RepositorioFacturas {
  constructor(
    readonly pool: Pool,
    readonly postgres: RepositorioPostgres,
    readonly caja: Caja,
  ) {}
}
