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
  insertar(cliente: pg.Client, empresaId: string): Promise<string>;
}

export async function crearEmpresa(cliente: pg.Client, empresaId: string): Promise<void> {
  await comoEmpresa(cliente, empresaId);
  await cliente.query('INSERT INTO public.empresas (id, razon_social) VALUES ($1, $2)', [empresaId, `Empresa ${empresaId}`]);
}

export const FABRICAS: Readonly<Record<string, FabricaDeFilas>> = {
  'public.empresas': {
    columnaEmpresa: 'id',
    columnaId: 'id',
    async insertar(cliente, empresaId) {
      await crearEmpresa(cliente, empresaId);
      return empresaId;
    },
  },
};

/** Para tablas hijas: crea la empresa (si es nueva) y deja la transacción como esa empresa. */
export async function prepararEmpresa(cliente: pg.Client, empresaId: string = nuevoId()): Promise<string> {
  await crearEmpresa(cliente, empresaId);
  return empresaId;
}
