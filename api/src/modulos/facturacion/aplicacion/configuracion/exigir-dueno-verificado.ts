import type { ContextoDeMiembro } from '../../../../compartido/aplicacion/index.js';
import { exigirPermiso, exigirSegundoFactor, Permiso } from '../../../../compartido/dominio/index.js';

/**
 * HU-07.04: la configuración DIAN es solo del dueño con la verificación en dos pasos. Leerla pide la de la jornada;
 * cambiarla, una de hace 10 minutos o menos (quien roba una sesión abierta no cambia el PIN ni la resolución).
 */
export function exigirDuenoVerificado(contexto: ContextoDeMiembro, para: 'leer' | 'cambiar'): void {
  exigirPermiso(contexto.rol, Permiso.ConfigurarFacturacion);
  exigirSegundoFactor(contexto.segundoFactor, para === 'leer' ? 'vigente' : 'reciente');
}
