import { comoEmpresa, enTransaccionDeshecha, errorDe, hayBase, nuevoId, requiereBase, url } from './base-de-pruebas.js';
import { FABRICAS } from './fabricas.js';

// Prueba de comportamiento por tabla (HU-01.05). Corre sola para cada tabla registrada en FABRICAS,
// y la prueba de catálogo obliga a registrar toda tabla nueva. Todo pasa en transacciones que se deshacen.
describe('aislamiento entre empresas por tabla (integración)', () => {
  it('tiene base de datos cuando CI la exige', () => {
    if (requiereBase) expect(url, 'Falta DATABASE_URL').toBeDefined();
  });

  describe.skipIf(!hayBase).each(Object.entries(FABRICAS))('%s', (tabla, fabrica) => {
    const contar = `SELECT count(*)::int AS n FROM ${tabla} WHERE ${fabrica.columnaId} = $1`;

    it('sin app.empresa_id no devuelve filas', async () => {
      await enTransaccionDeshecha(async (cliente) => {
        const id = await fabrica.insertar(cliente, nuevoId());
        await comoEmpresa(cliente, null);
        expect((await cliente.query(contar, [id])).rows[0]).toEqual({ n: 0 });
        expect((await cliente.query(`SELECT count(*)::int AS n FROM ${tabla}`)).rows[0]).toEqual({ n: 0 });
      });
    });

    it('la empresa A ve su fila y la empresa B no la ve ni la cambia', async () => {
      await enTransaccionDeshecha(async (cliente) => {
        const empresaA = nuevoId();
        const empresaB = nuevoId();
        const id = await fabrica.insertar(cliente, empresaA);

        await comoEmpresa(cliente, empresaA);
        expect((await cliente.query(contar, [id])).rows[0]).toEqual({ n: 1 });

        await comoEmpresa(cliente, empresaB);
        expect((await cliente.query(contar, [id])).rows[0]).toEqual({ n: 0 });
        const cambio = await cliente.query(`UPDATE ${tabla} SET ${fabrica.columnaEmpresa} = $2 WHERE ${fabrica.columnaId} = $1`, [id, empresaB]);
        expect(cambio.rowCount).toBe(0);
      });
    });

    it('la empresa A no puede pasar su fila a la empresa B (WITH CHECK)', async () => {
      await enTransaccionDeshecha(async (cliente) => {
        const empresaA = nuevoId();
        const id = await fabrica.insertar(cliente, empresaA);
        await comoEmpresa(cliente, empresaA);
        const error = await errorDe(cliente, `UPDATE ${tabla} SET ${fabrica.columnaEmpresa} = $2 WHERE ${fabrica.columnaId} = $1`, [id, nuevoId()]);
        expect(error?.message).toMatch(/row-level security|violates/);
      });
    });
  });
});
