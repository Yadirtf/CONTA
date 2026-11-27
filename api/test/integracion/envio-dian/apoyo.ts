import { avisosDeAceptacionPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/correos/avisos-de-aceptacion-postgres.js';
import type { Reloj } from '../../../src/compartido/aplicacion/index.js';
import { IdEmpresa } from '../../../src/compartido/dominio/index.js';
import { BaseDeDatos } from '../../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../../src/compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { Empresa } from '../../../src/modulos/empresas/index.js';
import { RepositorioEmpresasPostgres } from '../../../src/modulos/empresas/infraestructura/persistencia/repositorio-empresas-postgres.js';
import type { RepositoriosDeEnvio } from '../../../src/modulos/facturacion/aplicacion/puertos/repositorios-de-envio.js';
import { ColaDeTrabajosPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/cola-de-trabajos-postgres.js';
import { RegistroDeIntentosPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/registro-de-intentos-postgres.js';
import { RepositorioDeEnviosPostgres } from '../../../src/modulos/facturacion/infraestructura/persistencia/repositorio-de-envios-postgres.js';
import { nuevoId } from '../aislamiento/base-de-pruebas.js';

// Piezas reales de persistencia para las pruebas del envío. Las empresas llevan ids al azar y sus datos
// quedan en la base de pruebas (en CI, la rama de Neon del PR): conta_api no puede borrar envíos.

export function unidadDeTrabajoDeEnvios(baseDeDatos: BaseDeDatos): UnidadDeTrabajoPostgres<RepositoriosDeEnvio> {
  return new UnidadDeTrabajoPostgres(baseDeDatos, (ejecutor) => ({
    envios: new RepositorioDeEnviosPostgres(ejecutor),
    intentos: new RegistroDeIntentosPostgres(ejecutor),
    cola: new ColaDeTrabajosPostgres(ejecutor),
    avisos: avisosDeAceptacionPostgres(ejecutor),
  }));
}

export async function nuevaEmpresa(baseDeDatos: BaseDeDatos): Promise<IdEmpresa> {
  const id = IdEmpresa.de(nuevoId());
  const uow = new UnidadDeTrabajoPostgres(baseDeDatos, (e) => ({ empresas: new RepositorioEmpresasPostgres(e) }));
  await uow.ejecutar({ empresaId: id }, ({ empresas }) => empresas.guardar(Empresa.crear(id, 'Empresa de prueba de envíos')));
  return id;
}

/** Reloj que la prueba adelanta a mano. */
export class RelojDePrueba implements Reloj {
  constructor(private instante = new Date()) {}
  ahora(): Date {
    return this.instante;
  }
  adelantar(ms: number): void {
    this.instante = new Date(this.instante.getTime() + ms);
  }
}

export const cufeAlAzar = (): string =>
  Array.from({ length: 96 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
