import { ErrorDominio, Nit } from '../../../../compartido/dominio/index.js';
import { numeroDeDocumentoLimpio } from './numero-de-documento.js';

/** Menos caracteres devolverían media empresa: la búsqueda no es un listado (defensa contra la enumeración). */
export const MINIMO_DE_CARACTERES_PARA_BUSCAR = 3;
export const MAXIMO_DE_RESULTADOS = 10;

const FORMA = /^[A-Z0-9]+$/;
const LARGO_MAXIMO = 20;

/**
 * Lo que el cajero escribe para buscar al comprador (HU-05.01): el comienzo de su documento. Solo letras y
 * dígitos, así que nunca lleva comodines de LIKE. Si además es un NIT posible, trae su dígito de verificación.
 */
export class TerminoDeBusqueda {
  private constructor(
    readonly prefijo: string,
    readonly nit: Nit | null,
  ) {}

  static de(texto: string): TerminoDeBusqueda {
    const prefijo = numeroDeDocumentoLimpio(texto);
    if (prefijo.length < MINIMO_DE_CARACTERES_PARA_BUSCAR || prefijo.length > LARGO_MAXIMO || !FORMA.test(prefijo)) {
      throw new ErrorDominio(
        'cliente.busqueda-invalida',
        `Escribe de ${MINIMO_DE_CARACTERES_PARA_BUSCAR} a ${LARGO_MAXIMO} letras o números del documento`,
      );
    }
    return new TerminoDeBusqueda(prefijo, nitPosible(prefijo));
  }
}

function nitPosible(prefijo: string): Nit | null {
  try {
    return Nit.de(prefijo);
  } catch {
    return null;
  }
}
