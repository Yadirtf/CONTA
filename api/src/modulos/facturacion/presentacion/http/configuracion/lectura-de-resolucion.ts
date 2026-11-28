import { CLASES_DE_DOCUMENTO, type ClaseDeDocumento, type ResolucionEscrita } from '../../../dominio/index.js';
import { campoInvalido, camposDe, entero, texto, textoONulo, UUID } from './lectura-comun.js';

/** Lee el cuerpo de POST /configuracion-dian/resoluciones: el id (lo elige la app) y la resolución. */
export function resolucionDe(cuerpo: unknown): { id: string; resolucion: ResolucionEscrita } {
  const c = camposDe(cuerpo);
  const id = c['id'];
  if (typeof id !== 'string' || !UUID.test(id)) throw campoInvalido('id');
  const primerNumero = c['primerNumero'];
  return {
    id,
    resolucion: {
      clase: claseDe(c['clase']),
      numero: texto(c['numero'], 'numero', 20),
      prefijo: texto(c['prefijo'] ?? '', 'prefijo', 10),
      desde: entero(c['desde'], 'desde'),
      hasta: entero(c['hasta'], 'hasta'),
      vigenteDesde: texto(c['vigenteDesde'], 'vigenteDesde', 10),
      vigenteHasta: texto(c['vigenteHasta'], 'vigenteHasta', 10),
      primerNumero: primerNumero === undefined || primerNumero === null ? null : entero(primerNumero, 'primerNumero'),
      claveTecnica: textoONulo(c['claveTecnica'], 'claveTecnica', 200),
    },
  };
}

export function claseDe(valor: unknown): ClaseDeDocumento {
  if (!(CLASES_DE_DOCUMENTO as readonly unknown[]).includes(valor)) throw campoInvalido('clase');
  return valor as ClaseDeDocumento;
}
