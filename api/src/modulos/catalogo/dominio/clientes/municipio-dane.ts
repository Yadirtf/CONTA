/** Códigos DANE de los 33 departamentos y Bogotá (DIVIPOLA): los 2 primeros dígitos del municipio. */
const DEPARTAMENTOS = new Set([
  '05', '08', '11', '13', '15', '17', '18', '19', '20', '23', '25', '27', '41', '44', '47', '50', '52',
  '54', '63', '66', '68', '70', '73', '76', '81', '85', '86', '88', '91', '94', '95', '97', '99',
]);

/**
 * Código de municipio con forma DIVIPOLA: 5 dígitos, departamento existente y municipio distinto de 000.
 * No comprueba que el municipio exista: para eso hace falta la tabla completa del DANE (pendiente de HU-06.01).
 */
export function esMunicipioDane(codigo: string): boolean {
  return /^\d{5}$/.test(codigo) && DEPARTAMENTOS.has(codigo.slice(0, 2)) && codigo.slice(2) !== '000';
}
