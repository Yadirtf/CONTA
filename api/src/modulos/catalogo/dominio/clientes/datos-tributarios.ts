import { ErrorDominio, type TipoDeIdentificacion } from '../../../../compartido/dominio/index.js';

export const TIPOS_DE_PERSONA = ['natural', 'juridica'] as const;
export type TipoDePersona = (typeof TIPOS_DE_PERSONA)[number];

/** Responsabilidad del RUT (casilla 53) de quien no tiene ninguna: «No aplica - Otros». */
export const SIN_RESPONSABILIDADES = 'R-99-PN';

/**
 * Responsabilidades fiscales que admite la factura electrónica (anexo técnico de la DIAN, tabla de
 * responsabilidades fiscales): gran contribuyente, autorretenedor, agente de retención de IVA, régimen simple y
 * «no aplica». Una lista cerrada: «O-99» no existe (hallazgo H7 de la prueba de ataque).
 */
export const RESPONSABILIDADES_FISCALES = ['O-13', 'O-15', 'O-23', 'O-47', SIN_RESPONSABILIDADES] as const;

/** Una persona jurídica se identifica con NIT, o con el NIT de su país si es extranjera. */
const DOCUMENTOS_DE_PERSONA_JURIDICA: readonly TipoDeIdentificacion[] = ['31', '50'];

export function esTipoDePersona(valor: unknown): valor is TipoDePersona {
  return typeof valor === 'string' && (TIPOS_DE_PERSONA as readonly string[]).includes(valor);
}

/** Lo que la factura necesita del comprador ante los impuestos (adquirente del anexo técnico de la DIAN). */
export interface DatosTributarios {
  readonly tipoDePersona: TipoDePersona;
  /** Responsabilidades fiscales del RUT, por ejemplo «O-13»; R-99-PN si no tiene. */
  readonly responsabilidadesFiscales: readonly string[];
  /** Responsable de IVA (tributo 01) o no responsable (ZZ). */
  readonly responsableDeIva: boolean;
}

/** Sin responsabilidades escritas queda R-99-PN, que es lo que tiene casi todo comprador de mostrador. */
export function datosTributarios(datos: DatosTributarios, documento: TipoDeIdentificacion): DatosTributarios {
  if (!esTipoDePersona(datos.tipoDePersona)) {
    throw new ErrorDominio('cliente.tipo-de-persona-invalido', 'Indica si es persona natural o jurídica');
  }
  if (datos.tipoDePersona === 'juridica' && !DOCUMENTOS_DE_PERSONA_JURIDICA.includes(documento)) {
    throw new ErrorDominio('cliente.juridica-sin-nit', 'Una empresa (persona jurídica) se identifica con NIT');
  }
  const responsabilidades = [...new Set(datos.responsabilidadesFiscales)];
  if (!responsabilidades.every((r) => (RESPONSABILIDADES_FISCALES as readonly string[]).includes(r))) {
    throw new ErrorDominio('cliente.responsabilidad-invalida', 'Las responsabilidades del RUT son O-13, O-15, O-23, O-47 o R-99-PN');
  }
  if (responsabilidades.includes(SIN_RESPONSABILIDADES) && responsabilidades.length > 1) {
    throw new ErrorDominio('cliente.responsabilidad-invalida', 'R-99-PN significa que no tiene otras responsabilidades');
  }
  return {
    tipoDePersona: datos.tipoDePersona,
    responsabilidadesFiscales: responsabilidades.length > 0 ? responsabilidades : [SIN_RESPONSABILIDADES],
    responsableDeIva: datos.responsableDeIva === true,
  };
}
