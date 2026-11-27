import type { ConfiguracionDian } from '../../../aplicacion/puertos/generador-de-documento-electronico.js';
import type { ClaseDeDocumento } from '../../../dominio/index.js';

/**
 * Rechaza una configuración incompleta para la clase de documento. Los mensajes nunca incluyen la clave técnica ni
 * el PIN: son reservados. La factura exige la clave técnica (CUFE); el tiquete POS, el fabricante del software (su
 * CUDE usa el PIN).
 */
export function exigirConfiguracion(c: ConfiguracionDian, clase: ClaseDeDocumento): void {
  if (clase === 'factura' && !/^[\w-]{1,100}$/.test(c.claveTecnica))
    throw new Error('Configuración DIAN: falta la clave técnica o no es válida');
  if (clase === 'pos' && !fabricanteCompleto(c)) throw new Error('Configuración DIAN: falta el fabricante del software POS');
  if (!/^[\w-]{1,100}$/.test(c.idSoftware)) throw new Error('Configuración DIAN: falta el identificador del software');
  if (!/^\S{1,100}$/.test(c.pinSoftware)) throw new Error('Configuración DIAN: falta el PIN del software');
}

function fabricanteCompleto({ fabricante }: ConfiguracionDian): boolean {
  if (!fabricante) return false;
  return [fabricante.nombre, fabricante.razonSocial, fabricante.nombreDelSoftware].every((t) => t.trim().length > 0 && t.length <= 200);
}
