import type { IdUsuario, Modo, Rol, SegundoFactorDeLaSesion } from '../dominio/index.js';
import type { ContextoEmpresa } from './contexto-empresa.js';

/**
 * Empresa de la petición más quién la hace, con qué rol y en qué modo (HU-04.03, ADR-0012). Lo arma el resolutor con la
 * membresía activa leída en esa misma petición. Sirve para responder «no tienes permiso» temprano; los casos
 * de uso sensibles vuelven a leer el rol dentro de su propia transacción antes de cambiar algo.
 */
export interface ContextoDeMiembro extends ContextoEmpresa {
  readonly usuarioId: IdUsuario;
  readonly rol: Rol;
  /** No da permisos; junto con el rol decide si se exige el segundo factor (HU-04.04). */
  readonly modo: Modo;
  /**
   * Qué tan fresca está la verificación en dos pasos de la sesión (HU-07.04). La pone el resolutor en cada petición;
   * sin dato, los casos de uso la toman como sin verificar.
   */
  readonly segundoFactor?: SegundoFactorDeLaSesion;
}
