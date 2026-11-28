import { randomUUID } from 'node:crypto';
import { desc, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type {
  BitacoraDeConfiguracion,
  CambioDeConfiguracion,
} from '../../../aplicacion/puertos/repositorios-de-configuracion.js';
import { SECCIONES_DE_CONFIGURACION, type SeccionDeConfiguracion } from '../../../dominio/index.js';
import { cambiosDeConfiguracion } from './tablas-configuracion.js';

const EMPRESA = sql`conta_sistema.empresa_actual()`;

/** Bitácora de la configuración DIAN de la empresa de la transacción (RLS). conta_api solo inserta y lee. */
export class BitacoraPostgres implements BitacoraDeConfiguracion {
  constructor(private readonly ejecutor: Ejecutor) {}

  async anotar(seccion: SeccionDeConfiguracion, usuarioId: string): Promise<void> {
    await this.ejecutor.insert(cambiosDeConfiguracion).values({ empresaId: EMPRESA, id: randomUUID(), seccion, hechoPor: usuarioId, hechoEn: sql`now()` });
  }

  async recientes(cuantos: number): Promise<CambioDeConfiguracion[]> {
    const filas = await this.ejecutor.select().from(cambiosDeConfiguracion).orderBy(desc(cambiosDeConfiguracion.hechoEn)).limit(cuantos);
    return filas
      .filter((f) => (SECCIONES_DE_CONFIGURACION as readonly string[]).includes(f.seccion))
      .map((f) => ({ seccion: f.seccion as SeccionDeConfiguracion, hechoPor: f.hechoPor, hechoEn: f.hechoEn }));
  }
}
