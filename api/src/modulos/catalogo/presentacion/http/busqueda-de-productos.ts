import { BadRequestException } from '@nestjs/common';

const LARGO_MAXIMO = 60;

/**
 * El texto de GET /productos?buscar=. Va en la URL porque un producto no es un dato personal (a diferencia del
 * documento de un comprador). Un arreglo (?buscar=a&buscar=b) se rechaza. ?buscar[x]= es otra llave para el
 * lector de consultas de Express 5, así que se ignora y se lista.
 */
export function textoDeBusquedaDe(valor: unknown): string {
  if (valor === undefined) return '';
  if (typeof valor !== 'string' || valor.length > LARGO_MAXIMO) {
    throw new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: 'Revisa el campo buscar' });
  }
  return valor;
}
