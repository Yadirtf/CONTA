import type { BaseDeDatos } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type {
  RepositoriosDeIdentidad,
  UnidadDeTrabajoDeIdentidad,
} from '../../aplicacion/puertos/repositorios-de-identidad.js';
import { RepositorioDeAccesosPostgres } from './repositorio-de-accesos-postgres.js';
import { RegistroDeSegundoFactorPostgres } from './registro-de-segundo-factor-postgres.js';
import { RepositorioDeSegundosFactoresPostgres } from './repositorio-de-segundos-factores-postgres.js';
import { RepositorioDeSesionesPostgres } from './repositorio-de-sesiones-postgres.js';
import { RepositorioDeUsuariosPostgres } from './repositorio-de-usuarios-postgres.js';

/**
 * Transacción sobre conta_identidad. No fija empresa: estas tablas no tienen datos de ninguna, y las de negocio
 * siguen invisibles en ella porque RLS no ve filas sin empresa fijada (ADR-0006).
 */
export class UnidadDeTrabajoDeIdentidadPostgres implements UnidadDeTrabajoDeIdentidad {
  constructor(private readonly baseDeDatos: BaseDeDatos) {}

  ejecutar<T>(trabajo: (repositorios: RepositoriosDeIdentidad) => Promise<T>): Promise<T> {
    return this.baseDeDatos.drizzle().transaction((tx) =>
      trabajo({
        accesos: new RepositorioDeAccesosPostgres(tx),
        usuarios: new RepositorioDeUsuariosPostgres(tx),
        sesiones: new RepositorioDeSesionesPostgres(tx),
        segundosFactores: new RepositorioDeSegundosFactoresPostgres(tx),
        registroDeSegundoFactor: new RegistroDeSegundoFactorPostgres(tx),
      }),
    );
  }
}
