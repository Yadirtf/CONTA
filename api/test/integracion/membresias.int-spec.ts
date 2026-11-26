import pg from 'pg';
import type { ContextoDeMiembro } from '../../src/compartido/aplicacion/index.js';
import { IdEmpresa, IdUsuario } from '../../src/compartido/dominio/index.js';
import { BaseDeDatos } from '../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../src/compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { CambiarMembresia } from '../../src/modulos/empresas/aplicacion/comandos/cambiar-membresia.js';
import type { RepositoriosDeEmpresas } from '../../src/modulos/empresas/index.js';
import { RepositorioEmpresasPostgres } from '../../src/modulos/empresas/infraestructura/persistencia/repositorio-empresas-postgres.js';
import { RepositorioMembresiasPostgres } from '../../src/modulos/empresas/infraestructura/persistencia/repositorio-membresias-postgres.js';
import { comoEmpresa, enTransaccionDeshecha, errorDe, hayBase, nuevoId, url } from './aislamiento/base-de-pruebas.js';
import { crearEmpresa, crearUsuario } from './aislamiento/fabricas.js';

// Lo que la base impone a las membresías con roles (HU-04.03, ADR-0012): historia inmutable, estados posibles,
// columnas que la API puede cambiar y que dos cambios a la vez no dejen una empresa sin dueño.

const INSERTAR = `INSERT INTO conta.membresias (id, empresa_id, usuario_id, rol, modo, aceptada_en)
                  VALUES ($1, $2, $3, $4, $5, now())`;

async function miembro(cliente: pg.Client, empresa: string, usuario: string, rol = 'dueno', modo = 'simple'): Promise<string> {
  const id = nuevoId();
  await cliente.query(INSERTAR, [id, empresa, usuario, rol, modo]);
  return id;
}

/** Una empresa con una persona activa, y la transacción como esa empresa. */
async function escenario(cliente: pg.Client) {
  const empresa = nuevoId();
  const persona = await crearUsuario(cliente);
  await crearEmpresa(cliente, empresa);
  const membresia = await miembro(cliente, empresa, persona);
  return { empresa, persona, membresia };
}

describe.skipIf(!hayBase)('membresías con roles (integración)', () => {
  it('un cajero no queda en modo contador, ni hay roles o modos desconocidos', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { empresa } = await escenario(cliente);
      const nuevo = () => crearUsuario(cliente);
      expect((await errorDe(cliente, INSERTAR, [nuevoId(), empresa, await nuevo(), 'cajero', 'contador']))?.message).toMatch(/cajero_en_modo_simple/);
      expect((await errorDe(cliente, INSERTAR, [nuevoId(), empresa, await nuevo(), 'soporte', 'simple']))?.message).toMatch(/check constraint/);
      expect((await errorDe(cliente, INSERTAR, [nuevoId(), empresa, await nuevo(), 'dueno', 'experto']))?.message).toMatch(/check constraint/);
    });
  });

  it('una sola membresía vigente por persona; tras el retiro, la persona puede volver con una fila nueva', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { empresa, persona, membresia } = await escenario(cliente);
      expect((await errorDe(cliente, INSERTAR, [nuevoId(), empresa, persona, 'cajero', 'simple']))?.message).toMatch(/membresias_vigentes/);
      await cliente.query('UPDATE conta.membresias SET retirada_en = now(), retirada_por = usuario_id WHERE id = $1', [membresia]);
      await miembro(cliente, empresa, persona, 'cajero');
      const filas = await cliente.query('SELECT count(*)::int AS n FROM conta.membresias WHERE usuario_id = $1', [persona]);
      expect(filas.rows[0]).toEqual({ n: 2 });
    });
  });

  it('una membresía retirada no se modifica ni vuelve, y la aceptación no se deshace', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { membresia } = await escenario(cliente);
      const deshacerAceptacion = await errorDe(cliente, 'UPDATE conta.membresias SET aceptada_en = NULL WHERE id = $1', [membresia]);
      expect(deshacerAceptacion?.message).toMatch(/aceptación de una membresía no se cambia/);
      await cliente.query('UPDATE conta.membresias SET retirada_en = now(), retirada_por = usuario_id WHERE id = $1', [membresia]);
      for (const cambio of ['retirada_en = NULL, retirada_por = NULL', "rol = 'cajero'"]) {
        const error = await errorDe(cliente, `UPDATE conta.membresias SET ${cambio} WHERE id = $1`, [membresia]);
        expect(error?.message, cambio).toMatch(/retirada no se modifica/);
      }
    });
  });

  it('la API no cambia la persona, la empresa ni las fechas de creación, y no borra membresías', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { membresia } = await escenario(cliente);
      for (const cambio of [`usuario_id = '${nuevoId()}'`, 'creada_en = now()', `invitada_por = '${nuevoId()}'`, `id = '${nuevoId()}'`]) {
        const error = await errorDe(cliente, `UPDATE conta.membresias SET ${cambio} WHERE id = $1`, [membresia]);
        expect(error?.message, cambio).toMatch(/permission denied/);
      }
      expect((await errorDe(cliente, 'DELETE FROM conta.membresias WHERE id = $1', [membresia]))?.message).toMatch(/permission denied/);
    });
  });

  it('un retiro a medias (fecha sin quién) no se acepta', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { membresia } = await escenario(cliente);
      const error = await errorDe(cliente, 'UPDATE conta.membresias SET retirada_en = now() WHERE id = $1', [membresia]);
      expect(error?.message).toMatch(/membresias_retiro_completo/);
    });
  });

  it('en una transacción del usuario, una membresía retirada ya no muestra la empresa', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { empresa, persona, membresia } = await escenario(cliente);
      await cliente.query('UPDATE conta.membresias SET retirada_en = now(), retirada_por = usuario_id WHERE id = $1', [membresia]);
      await comoEmpresa(cliente, null);
      await cliente.query(`SELECT set_config('app.usuario_id', $1, true)`, [persona]);
      expect((await cliente.query('SELECT id FROM conta.empresas WHERE id = $1', [empresa])).rowCount).toBe(0);
      expect((await cliente.query('SELECT id FROM conta.membresias WHERE id = $1', [membresia])).rowCount).toBe(0);
    });
  });

  describe('dos dueños que se degradan uno al otro a la vez', () => {
    let baseDeDatos: BaseDeDatos;
    const empresa = nuevoId();
    let duenos: string[];

    beforeAll(async () => {
      const preparar = new pg.Client({ connectionString: url });
      await preparar.connect();
      try {
        await preparar.query('BEGIN');
        duenos = [await crearUsuario(preparar), await crearUsuario(preparar)];
        await crearEmpresa(preparar, empresa);
        for (const dueno of duenos) await miembro(preparar, empresa, dueno);
        await preparar.query('COMMIT');
      } finally {
        await preparar.end();
      }
      baseDeDatos = new BaseDeDatos(process.env, 2);
    });

    afterAll(async () => {
      await baseDeDatos?.cerrar();
    });

    it('uno gana y el otro recibe miembro.ultimo-dueno: la empresa nunca queda sin dueño', async () => {
      const uow = new UnidadDeTrabajoPostgres<RepositoriosDeEmpresas>(baseDeDatos, (ejecutor) => ({
        empresas: new RepositorioEmpresasPostgres(ejecutor),
        membresias: new RepositorioMembresiasPostgres(ejecutor),
      }));
      const cambiar = new CambiarMembresia(uow);
      const [a, b] = duenos.map((d) => IdUsuario.de(d)) as [IdUsuario, IdUsuario];
      const comoDueno = (usuarioId: IdUsuario): ContextoDeMiembro => ({ empresaId: IdEmpresa.de(empresa), usuarioId, rol: 'dueno' });

      const resultados = await Promise.allSettled([
        cambiar.ejecutar(comoDueno(a), b, { rol: 'cajero' }),
        cambiar.ejecutar(comoDueno(b), a, { rol: 'cajero' }),
      ]);

      expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rechazo = resultados.find((r) => r.status === 'rejected');
      expect(rechazo?.reason).toMatchObject({ codigo: expect.stringMatching(/^(miembro\.ultimo-dueno|empresa\.no-encontrada|permiso\.denegado)$/) });
      const quedan = await uow.ejecutar({ empresaId: IdEmpresa.de(empresa) }, ({ membresias }) => membresias.listarVigentes());
      expect(quedan.filter((m) => m.rol === 'dueno')).toHaveLength(1);
    });
  });
});
