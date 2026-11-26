import type { AccesoPorCelular, Celular, IdUsuario, SegundoFactor, Sesion, Usuario } from '../../dominio/index.js';
import type { RegistroDeSegundoFactor } from './registro-de-segundo-factor.js';

/** Accesos por celular. `tomar` bloquea la fila hasta el fin de la transacción: dos intentos no se cruzan. */
export interface RepositorioDeAccesos {
  tomar(celular: Celular): Promise<AccesoPorCelular>;
  guardar(acceso: AccesoPorCelular): Promise<void>;
}

export interface RepositorioDeUsuarios {
  buscarPorCelular(celular: Celular): Promise<Usuario | null>;
  /** Las personas que existan de esos ids, en cualquier orden. */
  buscarPorIds(ids: readonly IdUsuario[]): Promise<Usuario[]>;
  /** Crea el usuario o, si otro proceso lo creó a la vez, devuelve el existente. */
  crearOBuscar(usuario: Usuario): Promise<Usuario>;
}

/** Sesión guardada con su usuario. */
export interface SesionConUsuario {
  readonly sesion: Sesion;
  readonly usuario: Usuario;
}

/** Sesión tal como la necesita quien atiende una petición: además dice si su segundo factor sigue vigente. */
export interface SesionVigente extends SesionConUsuario {
  readonly segundoFactorVigente: boolean;
}

export interface RepositorioDeSesiones {
  abrir(sesion: Sesion, huellaDelToken: string): Promise<void>;
  buscarVigente(huellaDelToken: string, ahora: Date): Promise<SesionConUsuario | null>;
  revocar(idSesion: string, ahora: Date): Promise<void>;
  /** Anota que la sesión pasó el segundo factor (HU-04.04). */
  marcarVerificada(idSesion: string, ahora: Date): Promise<void>;
  /** Cierra las otras sesiones de la persona: se usa al cambiar de app autenticadora. */
  revocarLasDemas(usuarioId: IdUsuario, exceptoSesion: string, ahora: Date): Promise<void>;
}

/** Segundo factor de cada persona. `tomar` bloquea la fila: dos intentos no se cruzan. Sin fila, da uno nuevo. */
export interface RepositorioDeSegundosFactores {
  tomar(usuarioId: IdUsuario): Promise<SegundoFactor>;
  guardar(segundoFactor: SegundoFactor): Promise<void>;
}

export interface RepositoriosDeIdentidad {
  readonly accesos: RepositorioDeAccesos;
  readonly usuarios: RepositorioDeUsuarios;
  readonly sesiones: RepositorioDeSesiones;
  readonly segundosFactores: RepositorioDeSegundosFactores;
  readonly registroDeSegundoFactor: RegistroDeSegundoFactor;
}

/**
 * Transacción sobre las tablas de identidad. No lleva empresa: una persona existe antes de pertenecer a
 * una empresa y puede pertenecer a varias (HU-04.02). Si `trabajo` lanza, nada se guarda.
 */
export interface UnidadDeTrabajoDeIdentidad {
  ejecutar<T>(trabajo: (repositorios: RepositoriosDeIdentidad) => Promise<T>): Promise<T>;
}

export const UNIDAD_DE_TRABAJO_DE_IDENTIDAD = Symbol('UnidadDeTrabajoDeIdentidad');
