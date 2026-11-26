import { drizzle } from 'drizzle-orm/node-postgres';
import type { Ejecutor } from '../../src/compartido/infraestructura/persistencia/base-de-datos.js';
import { RepositorioProductosPostgres } from '../../src/modulos/catalogo/infraestructura/persistencia/repositorio-productos-postgres.js';
import { enTransaccionDeshecha, errorDe, hayBase } from './aislamiento/base-de-pruebas.js';
import { crearUsuario } from './aislamiento/fabricas.js';

// Cupo diario de altas por persona en conta_sistema.cupos_diarios (hallazgo N1 de HU-05.02): vive en la base,
// así que un reinicio de la API no lo borra, y el UPSERT nunca pasa del tope.
describe.skipIf(!hayBase)('cupo diario por persona (integración)', () => {
  it('gasta de a uno hasta el tope y luego niega sin sumar', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const usuarioId = await crearUsuario(cliente);
      const repositorio = new RepositorioProductosPostgres(drizzle(cliente) as unknown as Ejecutor);
      const resultados: boolean[] = [];
      for (let i = 0; i < 4; i++) resultados.push(await repositorio.consumirCupoDePersona(usuarioId, 3));
      expect(resultados).toEqual([true, true, true, false]);
      const { rows } = await cliente.query<{ usados: number }>(
        'SELECT usados FROM conta_sistema.cupos_diarios WHERE usuario_id = $1',
        [usuarioId],
      );
      expect(rows).toEqual([{ usados: 3 }]);
    });
  });

  it('la API no puede borrar cupos ni guardar uno en cero', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const usuarioId = await crearUsuario(cliente);
      const cero = await errorDe(
        cliente,
        "INSERT INTO conta_sistema.cupos_diarios VALUES ($1, 'productos', current_date, 0)",
        [usuarioId],
      );
      expect((cero as { code?: string } | null)?.code).toBe('23514');
    });
    await enTransaccionDeshecha(async (cliente) => {
      const borrar = await errorDe(cliente, 'DELETE FROM conta_sistema.cupos_diarios', []);
      expect((borrar as { code?: string } | null)?.code).toBe('42501');
    });
  });
});
