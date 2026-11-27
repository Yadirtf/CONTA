import { type DecimalExacto, type Dinero, type Identificacion, TIPOS_DE_IDENTIFICACION } from '../../../../compartido/dominio/index.js';

// Cómo se leen los valores en el comprobante impreso: pesos con punto de miles y coma decimal, como en Colombia.
// Solo da forma a textos ya calculados: nunca redondea ni convierte montos.

/** «$ 1.234.567,89». */
export function pesos(valor: Dinero): string {
  return `$ ${conMiles(valor.aTexto())}`;
}

/** «2», «0,5» o «1.250,125»: sin ceros de más. */
export function cantidad(valor: DecimalExacto): string {
  return conMiles(valor.aTexto());
}

/** «NIT 900123456-7» o «Cédula de ciudadanía 1020304050». */
export function identificacionLegible(identificacion: Identificacion): string {
  const tipo = TIPOS_DE_IDENTIFICACION[identificacion.tipo];
  const dv = identificacion.digitoVerificacion === null ? '' : `-${identificacion.digitoVerificacion}`;
  return `${tipo} ${identificacion.numero}${dv}`;
}

function conMiles(texto: string): string {
  const negativo = texto.startsWith('-');
  const [enteros = '0', decimales] = (negativo ? texto.slice(1) : texto).split('.');
  const agrupados = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativo ? '-' : ''}${agrupados}${decimales === undefined ? '' : `,${decimales}`}`;
}
