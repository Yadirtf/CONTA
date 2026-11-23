// Ejemplo que VIOLA las reglas a propósito.
import { FacturasController } from '../presentacion/facturas.controller.js';

export class RepositorioPostgres {
  constructor(readonly controlador: FacturasController) {}
}
