type Encabezados = Readonly<Record<string, string | string[] | undefined>>;

const PREFIJO = 'Bearer ';

/** Token de «Authorization: Bearer <token>», o '' si no viene. La consulta SesionDelToken valida su forma. */
export function tokenDeLaPeticion(encabezados: Encabezados): string {
  const cabecera = encabezados['authorization'];
  return typeof cabecera === 'string' && cabecera.startsWith(PREFIJO) ? cabecera.slice(PREFIJO.length) : '';
}
