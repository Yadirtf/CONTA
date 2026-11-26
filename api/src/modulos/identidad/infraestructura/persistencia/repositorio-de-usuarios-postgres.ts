import { eq, inArray } from 'drizzle-orm';
import type { Ejecutor } from '../../../../compartido/infraestructura/persistencia/base-de-datos.js';
import type { RepositorioDeUsuarios } from '../../aplicacion/puertos/repositorios-de-identidad.js';
import { Celular, IdUsuario, type Usuario } from '../../dominio/index.js';
import { usuarios } from './tablas-identidad.js';

type Fila = typeof usuarios.$inferSelect;

export const usuarioDeFila = (f: Fila): Usuario => ({ id: IdUsuario.de(f.id), celular: Celular.de(f.celular), creadoEn: f.creadoEn });

export class RepositorioDeUsuariosPostgres implements RepositorioDeUsuarios {
  constructor(private readonly ejecutor: Ejecutor) {}

  async buscarPorCelular(celular: Celular): Promise<Usuario | null> {
    const [fila] = await this.ejecutor.select().from(usuarios).where(eq(usuarios.celular, celular.e164));
    return fila ? usuarioDeFila(fila) : null;
  }

  async buscarPorIds(ids: readonly IdUsuario[]): Promise<Usuario[]> {
    const filas = await this.ejecutor
      .select()
      .from(usuarios)
      .where(inArray(usuarios.id, ids.map((id) => id.valor)));
    return filas.map(usuarioDeFila);
  }

  async crearOBuscar(usuario: Usuario): Promise<Usuario> {
    await this.ejecutor
      .insert(usuarios)
      .values({ id: usuario.id.valor, celular: usuario.celular.e164, creadoEn: usuario.creadoEn })
      .onConflictDoNothing({ target: usuarios.celular });
    const existente = await this.buscarPorCelular(usuario.celular);
    if (!existente) throw new Error('El usuario no quedó creado');
    return existente;
  }
}
