import { BadRequestException } from '@nestjs/common';
import { esTipoDeIva } from '../../../../compartido/dominio/index.js';
import type { DatosDeProductoNuevo } from '../../dominio/productos/index.js';

// Solo la forma de la petición; las reglas del IVA y del precio las aplica el dominio. Los largos frenan cuerpos
// enormes antes de llegar al dominio.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LARGO_MAXIMO_DEL_NOMBRE = 400;
const LARGO_MAXIMO_DEL_CODIGO = 60;
const LARGO_MAXIMO_CORTO = 20;

const campoInvalido = (campo: string) =>
  new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: `Revisa el campo ${campo}` });

const camposDe = (valor: unknown): Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};

const textoCorto = (valor: unknown, largo: number): valor is string => typeof valor === 'string' && valor.length <= largo;

/** Lee el cuerpo de POST /productos. El precio llega como texto: un number ya habría perdido precisión. */
export function productoNuevoDe(cuerpo: unknown): DatosDeProductoNuevo {
  const campos = camposDe(cuerpo);
  const { id, nombre, precio, tipoDeIva } = campos;
  if (typeof id !== 'string' || !UUID.test(id)) throw campoInvalido('id');
  if (!textoCorto(nombre, LARGO_MAXIMO_DEL_NOMBRE)) throw campoInvalido('nombre');
  if (!textoCorto(precio, LARGO_MAXIMO_CORTO)) throw campoInvalido('precio');
  if (!esTipoDeIva(tipoDeIva)) throw campoInvalido('tipoDeIva');
  return {
    id,
    nombre,
    codigo: opcional(campos['codigo'], 'codigo', LARGO_MAXIMO_DEL_CODIGO),
    unidad: opcional(campos['unidad'], 'unidad', LARGO_MAXIMO_CORTO),
    precio,
    precioIncluyeIva: siNoDe(campos['precioIncluyeIva']),
    tipoDeIva,
    tarifaIva: opcional(campos['tarifaIva'], 'tarifaIva', LARGO_MAXIMO_CORTO),
  };
}

function opcional(valor: unknown, campo: string, largo: number): string | null {
  if (valor === undefined || valor === null) return null;
  if (!textoCorto(valor, largo)) throw campoInvalido(campo);
  return valor;
}

/** Por defecto el precio trae el IVA: es como se anuncia en el mostrador. */
function siNoDe(valor: unknown): boolean {
  if (valor === undefined) return true;
  if (typeof valor !== 'boolean') throw campoInvalido('precioIncluyeIva');
  return valor;
}
