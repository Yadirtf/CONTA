import type pg from 'pg';
import { comoEmpresa, nuevoId } from './base-de-pruebas.js';

/**
 * Registro de tablas de negocio para la prueba de aislamiento (HU-01.05).
 * TODA tabla de los esquemas de negocio debe estar aquí: la prueba de catálogo falla si falta una.
 * Cada fábrica inserta una fila válida de la empresa dada (creando antes lo que necesite) y devuelve su id.
 */
export interface FabricaDeFilas {
  /** Columna con la llave de empresa: empresa_id en todas, salvo empresas (su propio id). */
  readonly columnaEmpresa: string;
  /** Columna que identifica la fila insertada. */
  readonly columnaId: string;
  /**
   * true si conta_api no puede cambiar la columna de empresa (UPDATE por columnas o sin UPDATE): la prueba
   * exige entonces que el cambio se niegue por permisos, una garantía más fuerte que la de RLS.
   */
  readonly empresaInmutable?: boolean;
  insertar(cliente: pg.Client, empresaId: string): Promise<string>;
}

const CUFE_DE_PRUEBA = 'a'.repeat(96);

/** Inserta un envío a la DIAN de la empresa (HU-02.03). */
export async function crearEnvioDian(cliente: pg.Client, empresaId: string): Promise<string> {
  await prepararEmpresa(cliente, empresaId);
  return insertarEnvioDian(cliente, empresaId);
}

/** Inserta un envío en una empresa que ya existe; deja la transacción como esa empresa. */
export async function insertarEnvioDian(cliente: pg.Client, empresaId: string): Promise<string> {
  await comoEmpresa(cliente, empresaId);
  const id = nuevoId();
  await cliente.query(
    `INSERT INTO conta.envios_dian (empresa_id, id, cufe, numero, nit_emisor, anio, consecutivo, xml_firmado, estado)
     VALUES ($1, $2, $3, 'SETP990000001', '900373076', 2026, 1, '<Invoice/>', 'pendiente')`,
    [empresaId, id, CUFE_DE_PRUEBA],
  );
  return id;
}

/** Inserta una persona de conta_identidad (sin empresa ni RLS) y devuelve su id. */
export async function crearUsuario(cliente: pg.Client): Promise<string> {
  const id = nuevoId();
  const celular = `+573${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;
  await cliente.query('INSERT INTO conta_identidad.usuarios (id, celular) VALUES ($1, $2)', [id, celular]);
  return id;
}

export async function crearEmpresa(cliente: pg.Client, empresaId: string): Promise<void> {
  await comoEmpresa(cliente, empresaId);
  await cliente.query('INSERT INTO conta.empresas (id, razon_social) VALUES ($1, $2)', [empresaId, `Empresa ${empresaId}`]);
}

export const FABRICAS: Readonly<Record<string, FabricaDeFilas>> = {
  'conta.empresas': {
    columnaEmpresa: 'id',
    columnaId: 'id',
    async insertar(cliente, empresaId) {
      await crearEmpresa(cliente, empresaId);
      return empresaId;
    },
  },
  'conta.envios_dian': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'id',
    empresaInmutable: true,
    insertar: crearEnvioDian,
  },
  'conta.membresias': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'usuario_id',
    empresaInmutable: true,
    async insertar(cliente, empresaId) {
      await prepararEmpresa(cliente, empresaId);
      const usuarioId = await crearUsuario(cliente);
      await cliente.query('INSERT INTO conta.membresias (empresa_id, usuario_id) VALUES ($1, $2)', [empresaId, usuarioId]);
      return usuarioId;
    },
  },
  'conta.intentos_envio_dian': {
    columnaEmpresa: 'empresa_id',
    columnaId: 'id',
    empresaInmutable: true,
    async insertar(cliente, empresaId) {
      const envioId = await crearEnvioDian(cliente, empresaId);
      const id = nuevoId();
      await cliente.query(
        `INSERT INTO conta.intentos_envio_dian (empresa_id, id, envio_id, numero, operacion, resultado, detalle, duracion_ms, ocurrido_en)
         VALUES ($1, $2, $3, 1, 'SendTestSetAsync', 'recibido', 'ZipKey de prueba', 10, now())`,
        [empresaId, id, envioId],
      );
      return id;
    },
  },
};

/** Para tablas hijas: crea la empresa (si es nueva) y deja la transacción como esa empresa. */
export async function prepararEmpresa(cliente: pg.Client, empresaId: string = nuevoId()): Promise<string> {
  await crearEmpresa(cliente, empresaId);
  return empresaId;
}
