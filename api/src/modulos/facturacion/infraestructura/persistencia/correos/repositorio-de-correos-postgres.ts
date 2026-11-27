import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Ejecutor } from '../../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { IntentoDeCorreo, RepositorioDeCorreos } from '../../../aplicacion/puertos/repositorio-de-correos.js';
import { CorreoDeFactura, type DatosDelCorreo, ESTADOS_DEL_CORREO, type EstadoDelCorreo } from '../../../dominio/index.js';
import { correosDeFactura, intentosCorreoDeFactura } from './tablas-correos.js';

// Corre en la transacción de una empresa: RLS solo deja ver y escribir sus correos. empresa_id sale siempre de
// conta_sistema.empresa_actual(), así que no se puede escribir en otra empresa.
const EMPRESA = sql`conta_sistema.empresa_actual()`;

export class RepositorioDeCorreosPostgres implements RepositorioDeCorreos {
  constructor(private readonly ejecutor: Ejecutor) {}

  async buscar(ventaId: string): Promise<CorreoDeFactura | null> {
    const [f] = await this.ejecutor.select().from(correosDeFactura).where(eq(correosDeFactura.ventaId, ventaId)).limit(1);
    if (!f) return null;
    return CorreoDeFactura.reconstituir({
      ventaId: f.ventaId,
      estado: estadoValido(f.estado),
      intentos: f.intentos,
      proximoIntentoEn: f.proximoIntentoEn,
      ultimaFalla: f.ultimaFalla,
    });
  }

  async solicitar(correo: CorreoDeFactura): Promise<void> {
    const d = correo.instantanea();
    await this.ejecutor
      .insert(correosDeFactura)
      .values({ empresaId: EMPRESA, ventaId: d.ventaId, estado: d.estado, intentos: d.intentos, proximoIntentoEn: d.proximoIntentoEn, ultimaFalla: d.ultimaFalla, actualizadoEn: sql`now()` })
      .onConflictDoNothing();
  }

  async actualizar(correo: CorreoDeFactura, leido: DatosDelCorreo): Promise<boolean> {
    const d = correo.instantanea();
    const filas = await this.ejecutor
      .update(correosDeFactura)
      .set({ estado: d.estado, intentos: d.intentos, proximoIntentoEn: d.proximoIntentoEn, ultimaFalla: d.ultimaFalla, actualizadoEn: sql`now()` })
      .where(
        and(
          eq(correosDeFactura.ventaId, d.ventaId),
          eq(correosDeFactura.intentos, leido.intentos),
          leido.ultimaFalla === null ? isNull(correosDeFactura.ultimaFalla) : eq(correosDeFactura.ultimaFalla, leido.ultimaFalla),
        ),
      )
      .returning({ ventaId: correosDeFactura.ventaId });
    return filas.length === 1;
  }

  async registrarIntento(intento: IntentoDeCorreo): Promise<void> {
    // Si ya hay un intento con ese número (uno forjado con la credencial de la API), no se pisa ni traba el correo (N1).
    await this.ejecutor.insert(intentosCorreoDeFactura).values({ empresaId: EMPRESA, ...intento }).onConflictDoNothing();
  }
}

function estadoValido(estado: string): EstadoDelCorreo {
  if (!(ESTADOS_DEL_CORREO as readonly string[]).includes(estado)) throw new Error(`Estado de correo desconocido: ${estado}`);
  return estado as EstadoDelCorreo;
}
