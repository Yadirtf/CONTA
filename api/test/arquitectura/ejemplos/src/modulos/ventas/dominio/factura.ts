// Ejemplo que VIOLA las reglas a propósito: lo usa test/arquitectura/reglas-de-dependencia.spec.ts.
import { Injectable } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { RepositorioFacturas } from '../aplicacion/repositorio-facturas.js';

@Injectable()
export class Factura {
  constructor(readonly repositorio: RepositorioFacturas) {}
  leer(): string {
    return readFileSync('x', 'utf8');
  }
}
