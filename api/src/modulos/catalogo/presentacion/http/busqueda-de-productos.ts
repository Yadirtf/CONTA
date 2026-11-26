import { BadRequestException } from '@nestjs/common';

const LARGO_MAXIMO = 60;

/**
 * El texto de GET /productos?buscar=. Va en la URL porque un producto no es un dato personal (a diferencia del
 * documento de un comprador). Un arreglo (?buscar=a&buscar=b) o un objeto (?buscar[x]=) se rechazan.
 */
export function textoDeBusquedaDe(valor: unknown): string {
  if (valor === undefined) return '';
  if (typeof valor !== 'string' || valor.length > LARGO_MAXIMO) {
    throw new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: 'Revisa el campo buscar' });
  }
  return valor;
}
