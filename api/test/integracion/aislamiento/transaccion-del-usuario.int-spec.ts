import pg from 'pg';
import { IdUsuario } from '../../../src/compartido/dominio/index.js';
import { BaseDeDatos } from '../../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoDelUsuarioPostgres } from '../../../src/compartido/infraestructura/persistencia/unidad-de-trabajo-del-usuario-postgres.js';
import { RepositorioDeMisEmpresasPostgres } from '../../../src/modulos/empresas/infraestructura/persistencia/repositorio-de-mis-empresas-postgres.js';
import { comoEmpresa, enTransaccionDeshecha, errorDe, hayBase, nuevoId, url } from './base-de-pruebas.js';
import { crearEmpresa, insertarEnvioDian, crearUsuario } from './fabricas.js';

// Transacción del usuario (HU-04.02, ADR-0011): fija la persona, no una empresa. Solo puede LEER sus
// membresías y sus empresas; nunca suma esa visibilidad a la de una empresa (las políticas se combinan con OR).

const comoUsuario = (cliente: pg.Client, usuarioId: string | null) =>
  cliente.query(`SELECT set_config('app.usuario_id', $1, true)`, [usuarioId ?? '']);

/** Dos empresas de la persona, una ajena con su envío a la DIAN, y la transacción ya sin empresa. */
async function escenario(cliente: pg.Client) {
  const persona = await crearUsuario(cliente);
  const otra = await crearUsuario(cliente);
  const [suya1, suya2, ajena] = [nuevoId(), nuevoId(), nuevoId()];
  for (const [empresa, miembro] of [[suya1, persona], [suya2, persona], [ajena, otra]] as const) {
    await crearEmpresa(cliente, empresa);
    await cliente.query(`INSERT INTO conta.membresias (id, empresa_id, usuario_id, rol, modo, aceptada_en) VALUES (gen_random_uuid(), $1, $2, 'dueno', 'simple', now())`, [empresa, miembro]);
  }
  await insertarEnvioDian(cliente, suya1);
  await comoEmpresa(cliente, null);
  return { persona, suyas: [suya1, suya2].sort(), ajena };
}

describe.skipIf(!hayBase)('transacción del usuario (integración)', () => {
  it('ve sus membresías y sus empresas, y nada de las ajenas', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { persona, suyas } = await escenario(cliente);
      await comoUsuario(cliente, persona);
      const empresas = await cliente.query<{ id: string }>('SELECT id FROM conta.empresas ORDER BY id');
      const membresias = await cliente.query<{ empresa_id: string }>('SELECT empresa_id FROM conta.membresias ORDER BY 1');
      expect(empresas.rows.map((f) => f.id)).toEqual(suyas);
      expect(membresias.rows.map((f) => f.empresa_id)).toEqual(suyas);
    });
  });

  it('no ve otras tablas de negocio, aunque sean de sus empresas', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { persona } = await escenario(cliente);
      await comoUsuario(cliente, persona);
      expect((await cliente.query('SELECT count(*)::int AS n FROM conta.envios_dian')).rows[0]).toEqual({ n: 0 });
    });
  });

  it('no puede escribir: ni crear empresas ni darse membresías', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { persona, suyas, ajena } = await escenario(cliente);
      await comoUsuario(cliente, persona);
      const crear = await errorDe(cliente, 'INSERT INTO conta.empresas (id, razon_social) VALUES ($1, $2)', [nuevoId(), 'X']);
      const unirse = await errorDe(cliente, `INSERT INTO conta.membresias (id, empresa_id, usuario_id, rol, modo, aceptada_en) VALUES (gen_random_uuid(), $1, $2, 'dueno', 'simple', now())`, [ajena, persona]);
      const renombrar = await cliente.query('UPDATE conta.empresas SET razon_social = $2 WHERE id = $1', [suyas[0], 'Otra']);
      expect(crear?.message).toMatch(/row-level security/);
      expect(unirse?.message).toMatch(/row-level security/);
      expect(renombrar.rowCount).toBe(0);
    });
  });

  it('con empresa fijada, la política del usuario no suma: solo se ve esa empresa', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { persona, suyas } = await escenario(cliente);
      // Solo una prueba puede fijar ambas a mano; las funciones de src/ lo impiden (siguiente prueba).
      await comoUsuario(cliente, persona);
      await comoEmpresa(cliente, suyas[0]!);
      expect((await cliente.query('SELECT id FROM conta.empresas')).rows).toEqual([{ id: suyas[0] }]);
    });
  });

  it('fijar_usuario y fijar_empresa se excluyen en los dos órdenes', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const { persona, suyas } = await escenario(cliente);
      await comoUsuario(cliente, persona);
      expect((await errorDe(cliente, 'SELECT conta_sistema.fijar_empresa($1)', [suyas[0]]))?.message).toMatch(/nunca de ambos/);
      await comoUsuario(cliente, null);
      await comoEmpresa(cliente, suyas[0]!);
      expect((await errorDe(cliente, 'SELECT conta_sistema.fijar_usuario($1)', [persona]))?.message).toMatch(/nunca de ambos/);
      await comoEmpresa(cliente, null);
      await cliente.query('SELECT conta_sistema.fijar_usuario($1)', [persona]);
      expect((await errorDe(cliente, 'SELECT conta_sistema.fijar_usuario($1)', [nuevoId()]))?.message).toMatch(/ya tenía un usuario/);
    });
  });

  it('con un pool de una conexión, el usuario no queda pegado para la transacción siguiente', async () => {
    const preparar = new pg.Client({ connectionString: url });
    await preparar.connect();
    const [persona, empresa] = [nuevoId(), nuevoId()];
    try {
      await preparar.query('BEGIN');
      await preparar.query(`INSERT INTO conta_identidad.usuarios (id, celular) VALUES ($1, $2)`, [persona, `+573${String(Date.now()).slice(-9)}`]);
      await crearEmpresa(preparar, empresa);
      await preparar.query(`INSERT INTO conta.membresias (id, empresa_id, usuario_id, rol, modo, aceptada_en) VALUES (gen_random_uuid(), $1, $2, 'dueno', 'simple', now())`, [empresa, persona]);
      await preparar.query('COMMIT');
    } finally {
      await preparar.end();
    }
    const baseDeDatos = new BaseDeDatos(process.env, 1);
    const uow = new UnidadDeTrabajoDelUsuarioPostgres(baseDeDatos, (e) => ({ misEmpresas: new RepositorioDeMisEmpresasPostgres(e) }));
    try {
      const deLaPersona = await uow.ejecutar({ usuarioId: IdUsuario.de(persona) }, ({ misEmpresas }) => misEmpresas.listar());
      const deOtra = await uow.ejecutar({ usuarioId: IdUsuario.de(nuevoId()) }, ({ misEmpresas }) => misEmpresas.listar());
      expect(deLaPersona.map((e) => e.empresa.id.valor)).toEqual([empresa]);
      expect(deOtra).toEqual([]);
    } finally {
      await baseDeDatos.cerrar();
    }
  });
});
