import { sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { DatosFiscalesGuardados } from '../../../aplicacion/puertos/repositorios-de-configuracion.js';
import type { Participante } from '../../../dominio/index.js';
import { datosFiscales, ventas } from '../ventas/tablas-ventas.js';
import { participanteDeFila } from './datos-fiscales-de-fila.js';
import { errorDePostgres, VIOLACION_DE_CHECK } from './errores-de-postgres.js';

const EMPRESA = sql`conta_sistema.empresa_actual()`;

/** Datos fiscales de la empresa de la transacción (RLS). Una fila por empresa: guardar la crea o la corrige. */
export class DatosFiscalesPostgres implements DatosFiscalesGuardados {
  constructor(private readonly ejecutor: Ejecutor) {}

  async leer(): Promise<Participante | null> {
    const [fila] = await this.ejecutor.select().from(datosFiscales).limit(1);
    return fila ? participanteDeFila(fila) : null;
  }

  async guardar(p: Participante): Promise<'guardados' | 'nit-con-ventas'> {
    const columnas = {
      nit: p.identificacion.numero,
      razonSocial: p.razonSocial,
      tipoDePersona: p.tipoDePersona,
      responsabilidadesFiscales: [...p.responsabilidadesFiscales],
      responsableDeIva: p.responsableDeIva,
      codigoMunicipio: p.direccion?.codigoMunicipio ?? '',
      ciudad: p.direccion?.ciudad ?? '',
      departamento: p.direccion?.departamento ?? '',
      direccion: p.direccion?.linea ?? '',
      correo: p.correo,
    };
    // Un punto de guardado: si el trigger nit_fijo_con_ventas lo impide, la transacción sigue viva para responder.
    return this.ejecutor
      .transaction(async (tx) => {
        await tx.insert(datosFiscales).values({ empresaId: EMPRESA, ...columnas }).onConflictDoUpdate({ target: datosFiscales.empresaId, set: columnas });
        return 'guardados' as const;
      })
      .catch((error: unknown) => {
        const { codigo, restriccion } = errorDePostgres(error);
        if (codigo === VIOLACION_DE_CHECK && restriccion === 'nit_fijo_con_ventas') return 'nit-con-ventas' as const;
        throw error;
      });
  }

  async hayVentas(): Promise<boolean> {
    const filas = await this.ejecutor.select({ id: ventas.id }).from(ventas).limit(1);
    return filas.length > 0;
  }
}
