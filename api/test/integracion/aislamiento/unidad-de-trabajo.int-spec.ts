import { sql } from 'drizzle-orm';
import { IdEmpresa } from '../../../src/compartido/dominio/index.js';
import { BaseDeDatos } from '../../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../../src/compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { Empresa, type RepositoriosDeEmpresas } from '../../../src/modulos/empresas/index.js';
import { RepositorioEmpresasPostgres } from '../../../src/modulos/empresas/infraestructura/persistencia/repositorio-empresas-postgres.js';
import { RepositorioMembresiasPostgres } from '../../../src/modulos/empresas/infraestructura/persistencia/repositorio-membresias-postgres.js';
import { hayBase, nuevoId } from './base-de-pruebas.js';

// La unidad de trabajo con un pool de UNA conexión: la misma conexión física pasa de una empresa a otra,
// como pasa con el pooler de Neon. Ninguna petición debe ver datos de la anterior (HU-01.05).
describe.skipIf(!hayBase)('UnidadDeTrabajoPostgres (integración)', () => {
  let baseDeDatos: BaseDeDatos;
  let uow: UnidadDeTrabajoPostgres<RepositoriosDeEmpresas>;
  const a = IdEmpresa.de(nuevoId());
  const b = IdEmpresa.de(nuevoId());

  beforeAll(async () => {
    baseDeDatos = new BaseDeDatos(process.env, 1);
    uow = new UnidadDeTrabajoPostgres(baseDeDatos, (ejecutor) => ({
      empresas: new RepositorioEmpresasPostgres(ejecutor),
      membresias: new RepositorioMembresiasPostgres(ejecutor),
    }));
    // Empresas de prueba con ids al azar: en CI viven en la rama de Neon del PR, que se borra al cerrarlo.
    await uow.ejecutar({ empresaId: a }, ({ empresas }) => empresas.guardar(Empresa.crear(a, 'Prueba A')));
    await uow.ejecutar({ empresaId: b }, ({ empresas }) => empresas.guardar(Empresa.crear(b, 'Prueba B')));
  });

  afterAll(async () => {
    await baseDeDatos?.cerrar();
  });

  it('200 transacciones alternando empresas sobre la misma conexión: cada una ve solo lo suyo', async () => {
    for (let i = 0; i < 200; i++) {
      const [propia, ajena] = i % 2 === 0 ? [a, b] : [b, a];
      const [vista, oculta] = await uow.ejecutar({ empresaId: propia }, ({ empresas }) =>
        Promise.all([empresas.buscar(propia), empresas.buscar(ajena)]),
      );
      expect(vista?.id.valor).toBe(propia.valor);
      expect(oculta).toBeNull();
    }
    // Son unas 1.000 idas y vueltas a la base; contra Neon desde Actions pasan de los 5 s por defecto.
  }, 60_000);

  it('si la transacción falla, se deshace y la conexión queda limpia para la siguiente empresa', async () => {
    const nueva = IdEmpresa.de(nuevoId());
    await expect(
      uow.ejecutar({ empresaId: nueva }, async ({ empresas }) => {
        await empresas.guardar(Empresa.crear(nueva, 'No debe quedar'));
        throw new Error('falla a propósito');
      }),
    ).rejects.toThrow('falla a propósito');
    expect(await uow.ejecutar({ empresaId: nueva }, ({ empresas }) => empresas.buscar(nueva))).toBeNull();
    expect((await uow.ejecutar({ empresaId: a }, ({ empresas }) => empresas.buscar(a)))?.razonSocial).toBe('Prueba A');
  });

  it('aborta si la conexión trae una empresa fijada a nivel de sesión, en vez de mezclar empresas', async () => {
    const db = baseDeDatos.drizzle();
    // Simula el error que el diseño evita: alguien fija la empresa para toda la sesión.
    await db.execute(sql`select set_config(${'app.empresa_id'}, ${a.valor}, false)`);
    try {
      const error = (await uow.ejecutar({ empresaId: b }, ({ empresas }) => empresas.buscar(b)).catch((e: unknown) => e)) as Error & {
        cause?: Error;
      };
      expect(error).toBeInstanceOf(Error);
      expect(error.cause?.message ?? error.message).toMatch(/ya tenía una empresa/);
    } finally {
      await db.execute(sql`select set_config(${'app.empresa_id'}, '', false)`);
    }
    expect((await uow.ejecutar({ empresaId: b }, ({ empresas }) => empresas.buscar(b)))?.razonSocial).toBe('Prueba B');
  });
});
