import { ErrorDominio, textoLimpio } from '../../../../compartido/dominio/index.js';
import type { ClaseDeDocumento } from '../documentos/clase-de-documento.js';
import { pinValido } from './secretos-dian.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Quién hizo el software: solo lo lleva el tiquete POS (extensión FabricanteSoftware). */
export interface FabricanteEscrito {
  readonly nombre: string;
  readonly razonSocial: string;
}

export interface SoftwareEscrito {
  readonly clase: ClaseDeDocumento;
  /** Identificador del software en el catálogo de la DIAN (uuid). */
  readonly idSoftware: string;
  /** PIN nuevo; null deja el que ya estaba guardado (no hace falta volver a escribirlo para cambiar otra cosa). */
  readonly pin: string | null;
  /** TestSetId del set de pruebas de habilitación de esa clase (uuid). */
  readonly testSetId: string;
  readonly fabricante: FabricanteEscrito | null;
}

export interface SoftwareDian {
  readonly clase: ClaseDeDocumento;
  readonly idSoftware: string;
  readonly pin: string | null;
  readonly testSetId: string;
  readonly fabricante: FabricanteEscrito | null;
}

/**
 * HU-07.04: el software que la DIAN registró para una clase de documento. El tiquete POS exige el fabricante; la
 * factura no lo lleva. Un software nuevo (sin PIN guardado) exige el PIN.
 */
export function softwareDian(s: SoftwareEscrito, hayPinGuardado: boolean): SoftwareDian {
  const idSoftware = s.idSoftware.trim().toLowerCase();
  const testSetId = s.testSetId.trim().toLowerCase();
  if (!UUID.test(idSoftware)) throw new ErrorDominio('software.id-invalido', 'El identificador del software es el que te dio la DIAN (formato uuid)');
  if (!UUID.test(testSetId)) throw new ErrorDominio('software.test-set-invalido', 'El TestSetId es el que te dio la DIAN (formato uuid)');
  if (s.pin === null && !hayPinGuardado) throw new ErrorDominio('software.falta-pin', 'Escribe el PIN del software');
  if (s.pin !== null && !pinValido(s.pin)) throw new ErrorDominio('software.pin-invalido', 'El PIN tiene de 4 a 40 letras o números');
  return { clase: s.clase, idSoftware, pin: s.pin, testSetId, fabricante: fabricanteDe(s) };
}

function fabricanteDe(s: SoftwareEscrito): FabricanteEscrito | null {
  if (s.clase === 'factura') {
    if (s.fabricante !== null) throw new ErrorDominio('software.fabricante-sobra', 'La factura no lleva fabricante del software');
    return null;
  }
  if (s.fabricante === null) throw new ErrorDominio('software.falta-fabricante', 'El tiquete POS lleva quién hizo el software');
  const nombre = textoLimpio(s.fabricante.nombre);
  const razonSocial = textoLimpio(s.fabricante.razonSocial);
  if ([nombre, razonSocial].some((t) => t.length === 0 || t.length > 200)) {
    throw new ErrorDominio('software.fabricante-invalido', 'El nombre y la razón social del fabricante tienen de 1 a 200 caracteres');
  }
  return { nombre, razonSocial };
}
