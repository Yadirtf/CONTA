import type { ConfiguracionDian } from '../../../aplicacion/puertos/generador-de-documento-electronico.js';

/** Rechaza una configuración incompleta. Los mensajes nunca incluyen la clave técnica ni el PIN: son reservados. */
export function exigirConfiguracion(c: ConfiguracionDian): void {
  if (!/^[\w-]{1,100}$/.test(c.claveTecnica))
    throw new Error('Configuración DIAN: falta la clave técnica o no es válida');
  if (!/^[\w-]{1,100}$/.test(c.idSoftware)) throw new Error('Configuración DIAN: falta el identificador del software');
  if (!/^\S{1,100}$/.test(c.pinSoftware)) throw new Error('Configuración DIAN: falta el PIN del software');
}
