import { ErrorDominio } from '../../../../compartido/dominio/index.js';

export const TIPOS_DE_PERSONA = ['natural', 'juridica'] as const;
export type TipoDePersona = (typeof TIPOS_DE_PERSONA)[number];

/** Responsabilidad del RUT (casilla 53) de quien no tiene ninguna: «No aplica - Otros». */
export const SIN_RESPONSABILIDADES = 'R-99-PN';

const RESPONSABILIDAD = /^(O-\d{2}|R-99-PN)$/;
const MAXIMO_DE_RESPONSABILIDADES = 10;

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
export function datosTributarios(datos: DatosTributarios): DatosTributarios {
  if (!esTipoDePersona(datos.tipoDePersona)) {
    throw new ErrorDominio('cliente.tipo-de-persona-invalido', 'Indica si es persona natural o jurídica');
  }
  const responsabilidades = [...new Set(datos.responsabilidadesFiscales)];
  if (responsabilidades.length > MAXIMO_DE_RESPONSABILIDADES || !responsabilidades.every((r) => RESPONSABILIDAD.test(r))) {
    throw new ErrorDominio('cliente.responsabilidad-invalida', 'Las responsabilidades del RUT son como O-13, O-15 o R-99-PN');
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
