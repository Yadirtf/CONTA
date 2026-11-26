import { comoEmpresa, enTransaccionDeshecha, errorDe, hayBase, nuevoId } from './aislamiento/base-de-pruebas.js';
import { crearUsuario, prepararEmpresa } from './aislamiento/fabricas.js';

// Restricciones de conta.productos (HU-05.02) que la API ya cumple, revisadas también en la base: un script de
// datos o una historia futura que escriba directo no puede dejar filas que el dominio no acepta.
describe.skipIf(!hayBase)('tabla conta.productos (integración)', () => {
  const insertar = (empresaId: string, creadoPor: string, cambios: Record<string, unknown>): [string, unknown[]] => {
    const fila = { nombre: 'Gaseosa', nombre_busqueda: 'gaseosa', tipo_de_iva: 'gravado', tarifa_iva: '19', ...cambios };
    return [
      `INSERT INTO conta.productos (empresa_id, id, nombre, nombre_busqueda, unidad, precio, tipo_de_iva, tarifa_iva, creado_por)
       VALUES ($1, $2, $3, $4, '94', 2500, $5, $6, $7)`,
      [empresaId, nuevoId(), fila.nombre, fila.nombre_busqueda, fila.tipo_de_iva, fila.tarifa_iva, creadoPor],
    ];
  };

  it('rechaza gravado sin tarifa (con NULL, «IN» no basta: hallazgo H1) y combinaciones que se contradicen', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const empresaId = await prepararEmpresa(cliente);
      const creadoPor = await crearUsuario(cliente);
      await comoEmpresa(cliente, empresaId);
      const casos: Record<string, unknown>[] = [
        { tipo_de_iva: 'gravado', tarifa_iva: null },
        { tipo_de_iva: 'gravado', tarifa_iva: '0' },
        { tipo_de_iva: 'exento', tarifa_iva: null },
        { tipo_de_iva: 'exento', tarifa_iva: '19' },
        { tipo_de_iva: 'excluido', tarifa_iva: '0' },
      ];
      for (const caso of casos) {
        const error = await errorDe(cliente, ...insertar(empresaId, creadoPor, caso));
        expect((error as { code?: string } | null)?.code, JSON.stringify(caso)).toBe('23514');
      }
      expect(await errorDe(cliente, ...insertar(empresaId, creadoPor, { tipo_de_iva: 'excluido', tarifa_iva: null }))).toBeNull();
    });
  });

  it('rechaza un nombre sin nada que se pueda buscar, en blanco o con comodines (hallazgos H2 y O9)', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const empresaId = await prepararEmpresa(cliente);
      const creadoPor = await crearUsuario(cliente);
      await comoEmpresa(cliente, empresaId);
      for (const nombre_busqueda of ['', ' ', ' pan', 'pan ', 'pan  dulce', '100%', 'a_b', 'a\\b']) {
        const error = await errorDe(cliente, ...insertar(empresaId, creadoPor, { nombre: 'X', nombre_busqueda }));
        expect((error as { code?: string } | null)?.code, JSON.stringify(nombre_busqueda)).toBe('23514');
      }
    });
  });

  it('acepta nombres en otros alfabetos (hallazgo N3)', async () => {
    await enTransaccionDeshecha(async (cliente) => {
      const empresaId = await prepararEmpresa(cliente);
      const creadoPor = await crearUsuario(cliente);
      await comoEmpresa(cliente, empresaId);
      for (const nombre of ['пиво', '日本酒', '김치', 'weißbier', 'شاي ٣']) {
        expect(await errorDe(cliente, ...insertar(empresaId, creadoPor, { nombre, nombre_busqueda: nombre })), nombre).toBeNull();
      }
    });
  });
});
