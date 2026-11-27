import pg from 'pg';
import { hayBase, requiereBase, url } from './base-de-pruebas.js';
import { FABRICAS } from './fabricas.js';

// Prueba de catálogo (HU-01.05, ADR-0006). Revisa en PostgreSQL TODAS las tablas de negocio, las de hoy y las
// que lleguen: si una migración crea una tabla sin las protecciones, esta prueba falla en CI y nombra la tabla.
// public se revisa también: una tabla creada ahí por error debe cumplir las mismas reglas o fallar aquí.
const ESQUEMAS_DE_NEGOCIO = ['conta', 'public'];
const ESQUEMAS_PROPIOS = ['conta', 'conta_sistema', 'public'];
const ROL_API = 'conta_api';

interface Tabla {
  nombre: string; // esquema.tabla
  rls: boolean;
  rlsForzado: boolean;
  dueno: string;
}

describe('catálogo de aislamiento multiempresa (integración)', () => {
  it('tiene base de datos cuando CI la exige', () => {
    if (requiereBase) expect(url, 'Falta DATABASE_URL').toBeDefined();
  });

  describe.skipIf(!hayBase)('contra la base', () => {
    let cliente: pg.Client;
    let tablas: Tabla[];
    const consultar = async <T extends pg.QueryResultRow>(texto: string, valores: unknown[] = []) =>
      (await cliente.query<T>(texto, valores)).rows;

    beforeAll(async () => {
      cliente = new pg.Client({ connectionString: url });
      await cliente.connect();
      tablas = await consultar<Tabla>(
        `SELECT n.nspname || '.' || c.relname AS nombre, c.relrowsecurity AS rls,
                c.relforcerowsecurity AS "rlsForzado", pg_get_userbyid(c.relowner) AS dueno
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind IN ('r', 'p') AND n.nspname = ANY($1)
          ORDER BY 1`,
        [ESQUEMAS_DE_NEGOCIO],
      );
    });

    afterAll(async () => {
      await cliente?.end();
    });

    it('la API se conecta como conta_api, sin superusuario ni BYPASSRLS, tampoco heredados', async () => {
      const [rol] = await consultar<{ rol: string; peligrosos: string[] }>(
        `SELECT current_user AS rol,
                array(SELECT r.rolname FROM pg_roles r
                       WHERE (r.rolsuper OR r.rolbypassrls) AND pg_has_role(current_user, r.oid, 'USAGE'))::text[] AS peligrosos`,
      );
      expect(rol?.rol).toBe(ROL_API);
      expect(rol?.peligrosos, 'Roles con superusuario o BYPASSRLS que conta_api usa o hereda').toEqual([]);
    });

    it('cada tabla de negocio está registrada en las fábricas de la prueba de aislamiento', () => {
      const sinFabrica = tablas.map((t) => t.nombre).filter((t) => !(t in FABRICAS));
      expect(sinFabrica, 'Agrega estas tablas a test/integracion/aislamiento/fabricas.ts').toEqual([]);
      const fabricasSinTabla = Object.keys(FABRICAS).filter((f) => !tablas.some((t) => t.nombre === f));
      expect(fabricasSinTabla, 'Fábricas de tablas que no existen').toEqual([]);
    });

    it('cada tabla tiene RLS activado y forzado, y su dueño no es la API', () => {
      const fallas = tablas
        .filter((t) => !t.rls || !t.rlsForzado || t.dueno === ROL_API)
        .map((t) => `${t.nombre}: rls=${t.rls} forzado=${t.rlsForzado} dueño=${t.dueno}`);
      expect(fallas).toEqual([]);
    });

    it('cada tabla tiene su llave de empresa uuid NOT NULL', async () => {
      const fallas: string[] = [];
      for (const tabla of tablas) {
        const columna = FABRICAS[tabla.nombre]?.columnaEmpresa ?? 'empresa_id';
        // pg_catalog y no information_schema: este último esconde las columnas sin permiso de conta_api.
        const [col] = await consultar<{ tipo: string; nula: boolean }>(
          `SELECT format_type(a.atttypid, a.atttypmod) AS tipo, NOT a.attnotnull AS nula FROM pg_attribute a
            WHERE a.attrelid = $1::regclass AND a.attname = $2 AND NOT a.attisdropped`,
          [tabla.nombre, columna],
        );
        if (!col || col.tipo !== 'uuid' || col.nula) fallas.push(`${tabla.nombre}.${columna}`);
      }
      expect(fallas, 'Columnas de empresa ausentes, no uuid o que admiten NULL').toEqual([]);
    });

    it('cada tabla tiene políticas y todas filtran por conta_sistema.empresa_actual() sobre su llave de empresa', async () => {
      const politicas = await consultar<{ tabla: string; nombre: string; comando: string; usando: string | null; verificando: string | null; permisiva: string }>(
        `SELECT schemaname || '.' || tablename AS tabla, policyname AS nombre, cmd AS comando,
                qual AS usando, with_check AS verificando, permissive AS permisiva
           FROM pg_policies WHERE schemaname = ANY($1)`,
        [ESQUEMAS_DE_NEGOCIO],
      );
      // Las políticas *_del_usuario_actual (ADR-0011) dejan leer, en una transacción del usuario, sus membresías
      // y sus empresas. No filtran por empresa: se revisan con su propia regla, más estricta.
      const SIN_EMPRESA = '(conta_sistema.empresa_actual() IS NULL)';
      const esDelUsuario = (p: { nombre: string }) => p.nombre.endsWith('_del_usuario_actual');
      const fallas: string[] = [];
      for (const tabla of tablas) {
        const columna = FABRICAS[tabla.nombre]?.columnaEmpresa ?? 'empresa_id';
        const propias = politicas.filter((p) => p.tabla === tabla.nombre);
        if (propias.length === 0) fallas.push(`${tabla.nombre}: sin políticas`);
        const filtra = (expresion: string | null) =>
          expresion !== null && expresion.includes('empresa_actual()') && new RegExp(`\\b${columna}\\b`).test(expresion);
        for (const p of propias.filter(esDelUsuario)) {
          // ADR-0011: solo lectura y solo sin empresa fijada; si no, se sumaría (OR) a la política de empresa.
          if (p.comando !== 'SELECT') fallas.push(`${tabla.nombre}.${p.nombre}: una política del usuario solo puede ser FOR SELECT`);
          if (!p.usando?.includes(SIN_EMPRESA) || !p.usando.includes('usuario_actual()')) {
            fallas.push(`${tabla.nombre}.${p.nombre}: USING debe exigir ${SIN_EMPRESA} y filtrar por usuario_actual()`);
          }
        }
        for (const p of propias.filter((p) => !esDelUsuario(p))) {
          if (p.comando !== 'INSERT' && !filtra(p.usando)) fallas.push(`${tabla.nombre}.${p.nombre}: USING no filtra por empresa`);
          if (['INSERT', 'UPDATE'].includes(p.comando) && !filtra(p.verificando)) {
            fallas.push(`${tabla.nombre}.${p.nombre}: WITH CHECK no filtra por empresa`);
          }
          if (p.comando === 'ALL' && p.verificando !== null && !filtra(p.verificando)) {
            fallas.push(`${tabla.nombre}.${p.nombre}: WITH CHECK no filtra por empresa`);
          }
        }
      }
      expect(fallas).toEqual([]);
    });

    it('cada llave foránea entre tablas de negocio incluye empresa_id, para no apuntar a otra empresa', async () => {
      const llaves = await consultar<{ tabla: string; nombre: string; destino: string; columnas: string[]; columnasDestino: string[] }>(
        `SELECT c.conrelid::regclass::text AS tabla, c.conname AS nombre, c.confrelid::regclass::text AS destino,
                array(SELECT a.attname FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k)::text[] AS columnas,
                array(SELECT a.attname FROM unnest(c.confkey) k JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k)::text[] AS "columnasDestino"
           FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
          WHERE c.contype = 'f' AND n.nspname = ANY($1)`,
        [ESQUEMAS_DE_NEGOCIO],
      );
      const conEsquema = (t: string) => (t.includes('.') ? t : `public.${t}`);
      const fallas = llaves
        .filter((l) => {
          const destino = conEsquema(l.destino);
          // Una tabla fuera de los esquemas de negocio (conta_identidad.usuarios) no tiene empresa: no hay a cuál cruzar.
          if (!ESQUEMAS_DE_NEGOCIO.includes(destino.split('.')[0]!)) return false;
          if (destino === 'conta.empresas') return !(l.columnas.length === 1 && l.columnas[0] === 'empresa_id');
          const i = l.columnas.indexOf('empresa_id');
          return i < 0 || l.columnasDestino[i] !== (FABRICAS[destino]?.columnaEmpresa ?? 'empresa_id');
        })
        .map((l) => `${conEsquema(l.tabla)}.${l.nombre} → ${conEsquema(l.destino)} (${l.columnas.join(', ')})`);
      expect(fallas, 'Use FK compuestas (empresa_id, x_id) → (empresa_id, id)').toEqual([]);
    });

    it('todo índice único, salvo la llave primaria por id, empieza por la llave de empresa', async () => {
      const indices = await consultar<{ tabla: string; nombre: string; columnas: string[] }>(
        `SELECT i.indrelid::regclass::text AS tabla, ci.relname AS nombre,
                array(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY k(attnum, o)
                        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum ORDER BY k.o)::text[] AS columnas
           FROM pg_index i JOIN pg_class ci ON ci.oid = i.indexrelid JOIN pg_namespace n ON n.oid = ci.relnamespace
          WHERE i.indisunique AND n.nspname = ANY($1)`,
        [ESQUEMAS_DE_NEGOCIO],
      );
      const fallas = indices
        .filter((ix) => {
          const tabla = ix.tabla.includes('.') ? ix.tabla : `public.${ix.tabla}`;
          const llave = FABRICAS[tabla]?.columnaEmpresa ?? 'empresa_id';
          const soloId = ix.columnas.length === 1 && ix.columnas[0] === (FABRICAS[tabla]?.columnaId ?? 'id');
          return !soloId && ix.columnas[0] !== llave;
        })
        .map((ix) => `${ix.tabla}.${ix.nombre} (${ix.columnas.join(', ')})`);
      expect(fallas, 'Un índice único global revela datos de otras empresas').toEqual([]);
    });

    it('ninguna tabla de negocio usa secuencias (serial o identity), que revelan el volumen de otras empresas', async () => {
      const columnas = await consultar<{ columna: string }>(
        `SELECT n.nspname || '.' || c.relname || '.' || a.attname AS columna
           FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid JOIN pg_namespace n ON n.oid = c.relnamespace
           LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
          WHERE c.relkind IN ('r', 'p') AND n.nspname = ANY($1) AND a.attnum > 0 AND NOT a.attisdropped
            AND (a.attidentity <> '' OR pg_get_expr(d.adbin, d.adrelid) LIKE 'nextval(%')`,
        [ESQUEMAS_DE_NEGOCIO],
      );
      expect(columnas.map((c) => c.columna)).toEqual([]);
    });

    it('no hay vistas sin security_invoker ni funciones SECURITY DEFINER que se salten RLS', async () => {
      const vistas = await consultar<{ nombre: string }>(
        `SELECT n.nspname || '.' || c.relname AS nombre FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind IN ('v', 'm') AND n.nspname = ANY($1)
            AND NOT coalesce('security_invoker=true' = ANY(c.reloptions), false)`,
        [ESQUEMAS_PROPIOS],
      );
      const funciones = await consultar<{ nombre: string }>(
        `SELECT n.nspname || '.' || p.proname AS nombre FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE p.prosecdef AND n.nspname = ANY($1)`,
        [ESQUEMAS_PROPIOS],
      );
      expect(vistas.map((v) => v.nombre), 'Vistas que corren como su dueño').toEqual([]);
      // Única excepción (ADR-0015): lee ids de correos vencidos de todas las empresas sin dar a conta_api una tabla
      // sin RLS. No devuelve datos ni escribe nada; se revisa su definición abajo.
      expect(funciones.map((f) => f.nombre), 'Funciones SECURITY DEFINER').toEqual(['conta_sistema.correos_vencidos']);
    });

    it('la función SECURITY DEFINER de los correos fija su search_path y solo devuelve ids', async () => {
      const [f] = await consultar<{ config: string[] | null; resultado: string; volatilidad: string }>(
        `SELECT p.proconfig AS config, pg_get_function_result(p.oid) AS resultado, p.provolatile AS volatilidad FROM pg_proc p
           JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'conta_sistema' AND p.proname = 'correos_vencidos'`,
        [],
      );
      expect(f?.config).toEqual(['search_path=pg_catalog, pg_temp']);
      // STABLE: no puede escribir (H3, nadie aplaza correos ajenos llamándola).
      expect(f?.volatilidad).toBe('s');
      expect(f?.resultado).toBe('TABLE(empresa_id uuid, venta_id uuid)');
    });
  });
});
