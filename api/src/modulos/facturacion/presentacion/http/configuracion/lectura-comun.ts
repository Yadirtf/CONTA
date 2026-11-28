import { BadRequestException } from '@nestjs/common';

// Ayudas para leer la forma de los cuerpos de la configuración DIAN (HU-07.04). Solo la forma y los largos: las
// reglas las aplica el dominio. Ningún mensaje repite lo recibido (podría ser un PIN).

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const campoInvalido = (campo: string) =>
  new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: `Revisa el campo ${campo}` });

export const camposDe = (valor: unknown): Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};

export function texto(valor: unknown, campo: string, largo: number): string {
  if (typeof valor !== 'string' || valor.length > largo) throw campoInvalido(campo);
  return valor;
}

export function textoONulo(valor: unknown, campo: string, largo: number): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  return texto(valor, campo, largo);
}

export function siNo(valor: unknown, campo: string): boolean {
  if (typeof valor !== 'boolean') throw campoInvalido(campo);
  return valor;
}

export function entero(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor)) throw campoInvalido(campo);
  return valor;
}
