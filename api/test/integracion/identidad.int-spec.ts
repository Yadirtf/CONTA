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

  it.each(['usuarios', 'accesos', 'sesiones', 'segundos_factores', 'eventos_de_segundo_factor'])('no puede borrar ni vaciar conta_identidad.%s', async (tabla) => {
    expect(await permiso(`conta_identidad.${tabla}`, 'DELETE')).toBe(false);
    expect(await permiso(`conta_identidad.${tabla}`, 'TRUNCATE')).toBe(false);
  });

  it('no puede cambiar el celular de un usuario ni el token de una sesión', async () => {
    expect(await permiso('conta_identidad.usuarios', 'UPDATE')).toBe(false);
    expect(await permisoDeColumna('conta_identidad.sesiones', 'huella_token')).toBe(false);
    expect(await permisoDeColumna('conta_identidad.sesiones', 'usuario_id')).toBe(false);
    expect(await permisoDeColumna('conta_identidad.sesiones', 'revocada_en')).toBe(true);
    expect(await permisoDeColumna('conta_identidad.sesiones', 'verificada_en')).toBe(true);
  });

  it('el segundo factor no cambia de dueño y su registro es de solo inserción (HU-04.04)', async () => {
    expect(await permisoDeColumna('conta_identidad.segundos_factores', 'usuario_id')).toBe(false);
    expect(await permisoDeColumna('conta_identidad.segundos_factores', 'secreto_cifrado')).toBe(true);
    expect(await permiso('conta_identidad.eventos_de_segundo_factor', 'UPDATE')).toBe(false);
    expect(await permiso('conta_identidad.eventos_de_segundo_factor', 'INSERT')).toBe(true);
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

  it('la base rechaza un secreto del segundo factor o un código de recuperación en claro', async () => {
    const persona = '77777777-7777-4777-8777-777777777777';
    await cliente.query('BEGIN');
    try {
      await cliente.query(`INSERT INTO conta_identidad.usuarios (id, celular) VALUES ($1, '+573009999998')`, [persona]);
      await cliente.query('SAVEPOINT antes');
      await expect(
        cliente.query(`INSERT INTO conta_identidad.segundos_factores (usuario_id, secreto_cifrado, confirmado_en) VALUES ($1, 'JBSWY3DPEHPK3PXP', now())`, [persona]),
      ).rejects.toThrow(/check/i);
      await cliente.query('ROLLBACK TO SAVEPOINT antes');
      await expect(
        cliente.query(`INSERT INTO conta_identidad.segundos_factores (usuario_id, huellas_de_recuperacion) VALUES ($1, ARRAY['ABCDE-FGHJK'])`, [persona]),
      ).rejects.toThrow(/check/i);
    } finally {
      await cliente.query('ROLLBACK');
    }
  });
});
