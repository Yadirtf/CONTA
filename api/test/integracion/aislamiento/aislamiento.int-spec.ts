import type pg from 'pg';
import { comoEmpresa, enTransaccionDeshecha, errorDe, hayBase, hayDueno, nuevoId, requiereBase, url, conFilaDelDueno } from './base-de-pruebas.js';
import { FABRICAS, type FabricaDeFilas } from './fabricas.js';

/**
 * Corre `prueba` en una transacción de conta_api que se deshace, con la fila ya insertada: en la misma transacción
 * si conta_api puede insertarla, o confirmada antes por el dueño (y borrada después) si conta_api solo la lee.
 */
function conFila(fabrica: FabricaDeFilas, empresaId: string, prueba: (cliente: pg.Client, id: string) => Promise<void>): Promise<void> {
  if (fabrica.delDueno) {
    return conFilaDelDueno((dueno) => fabrica.insertar(dueno, empresaId), empresaId, (id) => enTransaccionDeshecha((c) => prueba(c, id)));
  }
  return enTransaccionDeshecha(async (cliente) => prueba(cliente, await fabrica.insertar(cliente, empresaId)));
}

// Prueba de comportamiento por tabla (HU-01.05). Corre sola para cada tabla registrada en FABRICAS,
// y la prueba de catálogo obliga a registrar toda tabla nueva. Todo pasa en transacciones que se deshacen.
describe('aislamiento entre empresas por tabla (integración)', () => {
  it('tiene base de datos cuando CI la exige', () => {
    if (requiereBase) expect(url, 'Falta DATABASE_URL').toBeDefined();
  });

  it('tiene la conexión del dueño cuando CI la exige (tablas que la API solo lee)', () => {
    if (requiereBase) expect(hayDueno, 'Falta DATABASE_URL_DUENO').toBe(true);
  });

  describe.skipIf(!hayBase).each(Object.entries(FABRICAS))('%s', (tabla, fabrica) => {
    const sinDueno = fabrica.delDueno === true && !hayDueno;
    const contar = `SELECT count(*)::int AS n FROM ${tabla} WHERE ${fabrica.columnaId} = $1`;

    it.skipIf(sinDueno)('sin app.empresa_id no devuelve filas', async () => {
      await conFila(fabrica, nuevoId(), async (cliente, id) => {
        await comoEmpresa(cliente, null);
        expect((await cliente.query(contar, [id])).rows[0]).toEqual({ n: 0 });
        expect((await cliente.query(`SELECT count(*)::int AS n FROM ${tabla}`)).rows[0]).toEqual({ n: 0 });
      });
    });

    it.skipIf(sinDueno)('la empresa A ve su fila y la empresa B no la ve ni la cambia', async () => {
      const empresaA = nuevoId();
      const empresaB = nuevoId();
      await conFila(fabrica, empresaA, async (cliente, id) => {

        await comoEmpresa(cliente, empresaA);
        expect((await cliente.query(contar, [id])).rows[0]).toEqual({ n: 1 });

        await comoEmpresa(cliente, empresaB);
        expect((await cliente.query(contar, [id])).rows[0]).toEqual({ n: 0 });
        const cambiar = `UPDATE ${tabla} SET ${fabrica.columnaEmpresa} = $2 WHERE ${fabrica.columnaId} = $1`;
        if (fabrica.empresaInmutable) {
          expect((await errorDe(cliente, cambiar, [id, empresaB]))?.message).toMatch(/permission denied/);
        } else {
          expect((await cliente.query(cambiar, [id, empresaB])).rowCount).toBe(0);
        }
      });
    });

    it.skipIf(sinDueno)('la empresa A no puede pasar su fila a la empresa B (WITH CHECK)', async () => {
      const empresaA = nuevoId();
      await conFila(fabrica, empresaA, async (cliente, id) => {
        await comoEmpresa(cliente, empresaA);
        const error = await errorDe(cliente, `UPDATE ${tabla} SET ${fabrica.columnaEmpresa} = $2 WHERE ${fabrica.columnaId} = $1`, [id, nuevoId()]);
        expect(error?.message).toMatch(fabrica.empresaInmutable ? /permission denied/ : /row-level security|violates/);
      });
    });
  });
});
