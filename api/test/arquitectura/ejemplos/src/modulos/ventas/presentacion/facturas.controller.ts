// Ejemplo que VIOLA las reglas a propósito.
import type { RepositorioPostgres } from '../infraestructura/repositorio-postgres.js';

export class FacturasController {
  repositorio?: RepositorioPostgres;
}
