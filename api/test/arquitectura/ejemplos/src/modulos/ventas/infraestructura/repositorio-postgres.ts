// Ejemplo que VIOLA las reglas a propósito.
import pg from 'pg';
import { FacturasController } from '../presentacion/facturas.controller.js';

export class RepositorioPostgres {
  constructor(
    readonly controlador: FacturasController,
    readonly pool: pg.Pool,
  ) {}
}
