import type { AccesoPorCelular, Celular, Sesion, Usuario } from '../../dominio/index.js';

/** Accesos por celular. `tomar` bloquea la fila hasta el fin de la transacción: dos intentos no se cruzan. */
export interface RepositorioDeAccesos {
  tomar(celular: Celular): Promise<AccesoPorCelular>;
  guardar(acceso: AccesoPorCelular): Promise<void>;
}

export interface RepositorioDeUsuarios {
  buscarPorCelular(celular: Celular): Promise<Usuario | null>;
  /** Crea el usuario o, si otro proceso lo creó a la vez, devuelve el existente. */
  crearOBuscar(usuario: Usuario): Promise<Usuario>;
}

/** Sesión con su usuario, tal como la necesita quien atiende una petición. */
export interface SesionVigente {
  readonly sesion: Sesion;
  readonly usuario: Usuario;
}

export interface RepositorioDeSesiones {
  abrir(sesion: Sesion, huellaDelToken: string): Promise<void>;
  buscarVigente(huellaDelToken: string, ahora: Date): Promise<SesionVigente | null>;
  revocar(idSesion: string, ahora: Date): Promise<void>;
}

export interface RepositoriosDeIdentidad {
  readonly accesos: RepositorioDeAccesos;
  readonly usuarios: RepositorioDeUsuarios;
  readonly sesiones: RepositorioDeSesiones;
}

/**
 * Transacción sobre las tablas de identidad. No lleva empresa: una persona existe antes de pertenecer a
 * una empresa y puede pertenecer a varias (HU-04.02). Si `trabajo` lanza, nada se guarda.
 */
export interface UnidadDeTrabajoDeIdentidad {
  ejecutar<T>(trabajo: (repositorios: RepositoriosDeIdentidad) => Promise<T>): Promise<T>;
}

export const UNIDAD_DE_TRABAJO_DE_IDENTIDAD = Symbol('UnidadDeTrabajoDeIdentidad');
