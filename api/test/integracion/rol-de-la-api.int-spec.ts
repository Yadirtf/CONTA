import pg from 'pg';
import { urlBaseDeDatos } from '../../src/compartido/infraestructura/config/base-de-datos.js';

// HU-01.06: la API se conecta a Neon con un rol sin BYPASSRLS, y Row Level Security filtra por
// app.empresa_id en la rama de Neon del PR. Las pruebas de aislamiento por tabla (HU-01.05) están en
// ./aislamiento/; esta comprueba que el rol y la base dejan que esas pruebas tengan sentido.
//
// Sin DATABASE_URL se salta (en local). En CI, con Neon configurado, REQUIERE_BASE=true la vuelve obligatoria.
const url = urlBaseDeDatos();
const requiereBase = process.env['REQUIERE_BASE'] === 'true';

describe('rol de la API en la base de datos (integración)', () => {
  it('tiene base de datos cuando CI la exige', () => {
    if (requiereBase) expect(url, 'Falta DATABASE_URL: la rama de Neon del PR no llegó a la prueba').toBeDefined();
  });

  describe.skipIf(!url)('contra la base', () => {
    let cliente: pg.Client;

    beforeAll(async () => {
      cliente = new pg.Client({ connectionString: url });
      await cliente.connect();
    });

    afterAll(async () => {
      await cliente.end();
    });

    it('no es superusuario ni tiene BYPASSRLS', async () => {
      const { rows } = await cliente.query<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }>(
        'SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user',
      );
      const rol = rows[0];
      expect(rol, 'No se encontró el rol de la conexión').toBeDefined();
      expect(rol?.rolsuper, `El rol ${rol?.rolname} es superusuario: RLS no aplicaría`).toBe(false);
      expect(rol?.rolbypassrls, `El rol ${rol?.rolname} tiene BYPASSRLS: corre ALTER ROLE ${rol?.rolname} NOBYPASSRLS`).toBe(
        false,
      );
    });

    it('sin app.empresa_id no ve filas, y con él solo las de su empresa', async () => {
      // Tabla temporal dentro de una transacción que se deshace: no deja rastro en la rama de Neon.
      await cliente.query('BEGIN');
      try {
        await cliente.query(`CREATE TEMP TABLE prueba_aislamiento (empresa_id uuid NOT NULL, dato text NOT NULL) ON COMMIT DROP`);
        await cliente.query('ALTER TABLE prueba_aislamiento ENABLE ROW LEVEL SECURITY');
        await cliente.query('ALTER TABLE prueba_aislamiento FORCE ROW LEVEL SECURITY');
        await cliente.query(`CREATE POLICY por_empresa ON prueba_aislamiento
          USING (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid)
          WITH CHECK (empresa_id = nullif(current_setting('app.empresa_id', true), '')::uuid)`);

        const a = '00000000-0000-4000-8000-00000000000a';
        const b = '00000000-0000-4000-8000-00000000000b';
        for (const [empresa, dato] of [
          [a, 'venta de A'],
          [b, 'venta de B'],
        ] as const) {
          await cliente.query(`SELECT set_config('app.empresa_id', $1, true)`, [empresa]);
          await cliente.query('INSERT INTO prueba_aislamiento VALUES ($1, $2)', [empresa, dato]);
        }

        await cliente.query(`SELECT set_config('app.empresa_id', '', true)`);
        const sinEmpresa = await cliente.query('SELECT dato FROM prueba_aislamiento');
        expect(sinEmpresa.rows).toEqual([]);

        await cliente.query(`SELECT set_config('app.empresa_id', $1, true)`, [a]);
        const deA = await cliente.query<{ dato: string }>('SELECT dato FROM prueba_aislamiento');
        expect(deA.rows.map((f) => f.dato)).toEqual(['venta de A']);

        await expect(
          cliente.query('INSERT INTO prueba_aislamiento VALUES ($1, $2)', [b, 'A escribiendo en B']),
        ).rejects.toThrow(/row-level security/);
      } finally {
        await cliente.query('ROLLBACK');
      }
    });
  });
});
