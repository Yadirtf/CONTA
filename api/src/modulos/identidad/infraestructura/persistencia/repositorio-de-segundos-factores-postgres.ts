import { eq } from 'drizzle-orm';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { RepositorioDeSegundosFactores } from '../../aplicacion/puertos/repositorios-de-identidad.js';
import { type IdUsuario, SegundoFactor } from '../../dominio/index.js';
import { segundosFactores } from './tablas-identidad.js';

export class RepositorioDeSegundosFactoresPostgres implements RepositorioDeSegundosFactores {
  constructor(private readonly ejecutor: Ejecutor) {}

  /** Crea la fila si no existe y la bloquea (FOR UPDATE): los intentos de la misma persona van en fila. */
  async tomar(usuarioId: IdUsuario): Promise<SegundoFactor> {
    await this.ejecutor
      .insert(segundosFactores)
      .values({ usuarioId: usuarioId.valor, fallos: 0, huellasDeRecuperacion: [], actualizadoEn: new Date() })
      .onConflictDoNothing();
    const [fila] = await this.ejecutor.select().from(segundosFactores).where(eq(segundosFactores.usuarioId, usuarioId.valor)).for('update');
    if (!fila) throw new Error('El segundo factor de la persona no quedó creado');
    return SegundoFactor.desde({
      usuarioId,
      secretoCifrado: fila.secretoCifrado,
      confirmadoEn: fila.confirmadoEn,
      pendiente:
        fila.secretoPendiente && fila.pendienteVenceEn ? { secretoCifrado: fila.secretoPendiente, venceEn: fila.pendienteVenceEn } : null,
      ultimoPaso: fila.ultimoPaso,
      fallos: fila.fallos,
      bloqueadoHasta: fila.bloqueadoHasta,
      huellasDeRecuperacion: fila.huellasDeRecuperacion,
    });
  }

  async guardar(segundoFactor: SegundoFactor): Promise<void> {
    const e = segundoFactor.foto;
    await this.ejecutor
      .update(segundosFactores)
      .set({
        secretoCifrado: e.secretoCifrado,
        confirmadoEn: e.confirmadoEn,
        secretoPendiente: e.pendiente?.secretoCifrado ?? null,
        pendienteVenceEn: e.pendiente?.venceEn ?? null,
        ultimoPaso: e.ultimoPaso,
        fallos: e.fallos,
        bloqueadoHasta: e.bloqueadoHasta,
        huellasDeRecuperacion: [...e.huellasDeRecuperacion],
        actualizadoEn: new Date(),
      })
      .where(eq(segundosFactores.usuarioId, e.usuarioId.valor));
  }
}
