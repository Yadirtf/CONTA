import pg from 'pg';
import { hayBase, url } from './aislamiento/base-de-pruebas.js';

// HU-04.01: las tablas de identidad no tienen empresa (ADR-0010), así que la protección es de permisos:
// conta_api no borra nada, no cambia el celular de nadie y no reescribe el token de una sesión.
describe.skipIf(!hayBase)('permisos de conta_api sobre conta_identidad (integración)', () => {
  let cliente: pg.Client;
  beforeAll(async () => {
    cliente = new pg.Client({ connectionString: url });
    await cliente.connect();
  });
  afterAll(async () => {
    await cliente?.end();
  });

  const permiso = async (tabla: string, privilegio: string) =>
    (await cliente.query<{ tiene: boolean }>('SELECT has_table_privilege($1, $2) AS tiene', [tabla, privilegio])).rows[0]?.tiene;
  const permisoDeColumna = async (tabla: string, columna: string) =>
    (await cliente.query<{ tiene: boolean }>(`SELECT has_column_privilege($1, $2, 'UPDATE') AS tiene`, [tabla, columna])).rows[0]
      ?.tiene;

  it.each(['usuarios', 'accesos', 'sesiones'])('no puede borrar ni vaciar conta_identidad.%s', async (tabla) => {
    expect(await permiso(`conta_identidad.${tabla}`, 'DELETE')).toBe(false);
    expect(await permiso(`conta_identidad.${tabla}`, 'TRUNCATE')).toBe(false);
  });

  it('no puede cambiar el celular de un usuario ni el token de una sesión', async () => {
    expect(await permiso('conta_identidad.usuarios', 'UPDATE')).toBe(false);
    expect(await permisoDeColumna('conta_identidad.sesiones', 'huella_token')).toBe(false);
    expect(await permisoDeColumna('conta_identidad.sesiones', 'usuario_id')).toBe(false);
    expect(await permisoDeColumna('conta_identidad.sesiones', 'revocada_en')).toBe(true);
  });

  it('la base rechaza un código o un token guardado en claro', async () => {
    await cliente.query('BEGIN');
    try {
      await expect(
        cliente.query(`INSERT INTO conta_identidad.accesos (celular, huella_codigo, codigo_vence_en) VALUES ('+573009999999', '123456', now())`),
      ).rejects.toThrow(/check/i);
    } finally {
      await cliente.query('ROLLBACK');
    }
  });
});
