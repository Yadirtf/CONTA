import { eq, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { SoftwareGuardado, SoftwarePorGuardar, SoftwaresGuardados } from '../../../aplicacion/puertos/repositorios-de-configuracion.js';
import { type ClaseDeDocumento, claseDeDocumento } from '../../../dominio/index.js';
import { softwareDian } from './tablas-configuracion.js';

const EMPRESA = sql`conta_sistema.empresa_actual()`;

/** Software DIAN por clase de la empresa de la transacción (RLS). El PIN entra y sale solo cifrado. */
export class SoftwaresPostgres implements SoftwaresGuardados {
  constructor(private readonly ejecutor: Ejecutor) {}

  async de(clase: ClaseDeDocumento): Promise<SoftwareGuardado | null> {
    const [f] = await this.ejecutor.select().from(softwareDian).where(eq(softwareDian.clase, clase)).limit(1);
    if (!f) return null;
    return {
      clase: claseDeDocumento(f.clase),
      idSoftware: f.idSoftware,
      pinCifrado: f.pinCifrado,
      finalDelPin: f.pinFinal,
      testSetId: f.testSetId,
      fabricante:
        f.fabricanteNombre !== null && f.fabricanteRazonSocial !== null
          ? { nombre: f.fabricanteNombre, razonSocial: f.fabricanteRazonSocial }
          : null,
      actualizadoEn: f.actualizadoEn,
    };
  }

  /** Sin PIN nuevo solo actualiza lo demás: el PIN de la fila no se toca, aunque otro lo cambie al mismo tiempo. */
  async guardar(s: SoftwarePorGuardar, usuarioId: string): Promise<void> {
    const columnas = {
      idSoftware: s.idSoftware,
      testSetId: s.testSetId,
      fabricanteNombre: s.fabricante?.nombre ?? null,
      fabricanteRazonSocial: s.fabricante?.razonSocial ?? null,
      actualizadoEn: sql`now()`,
      actualizadoPor: usuarioId,
    };
    if (s.pin === null) {
      await this.ejecutor.update(softwareDian).set(columnas).where(eq(softwareDian.clase, s.clase));
      return;
    }
    const conPin = { ...columnas, pinCifrado: s.pin.pinCifrado, pinFinal: s.pin.finalDelPin };
    await this.ejecutor
      .insert(softwareDian)
      .values({ empresaId: EMPRESA, clase: s.clase, ...conPin })
      .onConflictDoUpdate({ target: [softwareDian.empresaId, softwareDian.clase], set: conPin });
  }
}
