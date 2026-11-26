import type { IdUsuario, Rol } from '../dominio/index.js';
import type { ContextoEmpresa } from './contexto-empresa.js';

/**
 * Empresa de la petición más quién la hace y con qué rol (HU-04.03, ADR-0012). Lo arma el resolutor con la
 * membresía activa leída en esa misma petición. Sirve para responder «no tienes permiso» temprano; los casos
 * de uso sensibles vuelven a leer el rol dentro de su propia transacción antes de cambiar algo.
 */
export interface ContextoDeMiembro extends ContextoEmpresa {
  readonly usuarioId: IdUsuario;
  readonly rol: Rol;
}
