import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { RepositorioDeSesiones, SesionConUsuario } from '../../aplicacion/puertos/repositorios-de-identidad.js';
import { IdUsuario, type Sesion } from '../../dominio/index.js';
import { usuarioDeFila } from './repositorio-de-usuarios-postgres.js';
import { sesiones, usuarios } from './tablas-identidad.js';

export class RepositorioDeSesionesPostgres implements RepositorioDeSesiones {
  constructor(private readonly ejecutor: Ejecutor) {}

  async abrir(sesion: Sesion, huellaDelToken: string): Promise<void> {
    await this.ejecutor.insert(sesiones).values({
      id: sesion.id,
      usuarioId: sesion.usuarioId.valor,
      huellaToken: huellaDelToken,
      creadaEn: sesion.creadaEn,
      venceEn: sesion.venceEn,
    });
  }

  async buscarVigente(huellaDelToken: string, ahora: Date): Promise<SesionConUsuario | null> {
    const [fila] = await this.ejecutor
      .select({ sesion: sesiones, usuario: usuarios })
      .from(sesiones)
      .innerJoin(usuarios, eq(usuarios.id, sesiones.usuarioId))
      .where(and(eq(sesiones.huellaToken, huellaDelToken), isNull(sesiones.revocadaEn), gt(sesiones.venceEn, ahora)));
    if (!fila) return null;
    const { sesion: s } = fila;
    return {
      sesion: { id: s.id, usuarioId: IdUsuario.de(s.usuarioId), creadaEn: s.creadaEn, venceEn: s.venceEn, verificadaEn: s.verificadaEn },
      usuario: usuarioDeFila(fila.usuario),
    };
  }

  async revocar(idSesion: string, ahora: Date): Promise<void> {
    await this.ejecutor
      .update(sesiones)
      .set({ revocadaEn: ahora })
      .where(and(eq(sesiones.id, idSesion), isNull(sesiones.revocadaEn)));
  }

  async marcarVerificada(idSesion: string, ahora: Date): Promise<void> {
    await this.ejecutor
      .update(sesiones)
      .set({ verificadaEn: ahora })
      .where(and(eq(sesiones.id, idSesion), isNull(sesiones.revocadaEn)));
  }

  async revocarLasDemas(usuarioId: IdUsuario, exceptoSesion: string, ahora: Date): Promise<void> {
    await this.ejecutor
      .update(sesiones)
      .set({ revocadaEn: ahora })
      .where(and(eq(sesiones.usuarioId, usuarioId.valor), ne(sesiones.id, exceptoSesion), isNull(sesiones.revocadaEn)));
  }
}
