import { BadRequestException } from '@nestjs/common';
import { esTipoDeIdentificacion } from '../../../../compartido/dominio/index.js';
import { type DatosDeClienteNuevo, type Direccion, esTipoDePersona } from '../../dominio/clientes/index.js';

// Solo la forma de la petición; las reglas de la DIAN las aplica el dominio. Los largos frenan cuerpos enormes
// antes de llegar al dominio.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LARGO_MAXIMO_DEL_NUMERO = 30;
const LARGO_MAXIMO_DEL_NOMBRE = 600;
const LARGO_MAXIMO_DE_TEXTO = 300;
const MAXIMO_DE_RESPONSABILIDADES = 10;

const campoInvalido = (campo: string) =>
  new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: `Revisa el campo ${campo}` });

const camposDe = (valor: unknown): Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : {};

const textoCorto = (valor: unknown, largo: number): valor is string => typeof valor === 'string' && valor.length <= largo;

/** Lee el cuerpo de POST /clientes. */
export function clienteNuevoDe(cuerpo: unknown): DatosDeClienteNuevo {
  const campos = camposDe(cuerpo);
  const { id, tipoDocumento, numero, nombre, tipoDePersona } = campos;
  if (typeof id !== 'string' || !UUID.test(id)) throw campoInvalido('id');
  if (!esTipoDeIdentificacion(tipoDocumento)) throw campoInvalido('tipoDocumento');
  if (!textoCorto(numero, LARGO_MAXIMO_DEL_NUMERO)) throw campoInvalido('numero');
  if (!textoCorto(nombre, LARGO_MAXIMO_DEL_NOMBRE)) throw campoInvalido('nombre');
  if (!esTipoDePersona(tipoDePersona)) throw campoInvalido('tipoDePersona');
  return {
    id,
    tipoDeIdentificacion: tipoDocumento,
    numero,
    digitoEscrito: digitoDe(campos['digitoVerificacion']),
    nombre,
    tipoDePersona,
    responsabilidadesFiscales: responsabilidadesDe(campos['responsabilidadesFiscales']),
    responsableDeIva: siNoDe(campos['responsableDeIva']),
    correo: correoDe(campos['correo']),
    direccion: direccionDe(campos['direccion']),
  };
}

function digitoDe(valor: unknown): number | null {
  if (valor === undefined || valor === null) return null;
  if (!Number.isInteger(valor) || (valor as number) < 0 || (valor as number) > 9) throw campoInvalido('digitoVerificacion');
  return valor as number;
}

function responsabilidadesDe(valor: unknown): string[] {
  if (valor === undefined) return [];
  if (!Array.isArray(valor) || valor.length > MAXIMO_DE_RESPONSABILIDADES || !valor.every((r) => textoCorto(r, 10))) {
    throw campoInvalido('responsabilidadesFiscales');
  }
  return valor;
}

function siNoDe(valor: unknown): boolean {
  if (valor === undefined) return false;
  if (typeof valor !== 'boolean') throw campoInvalido('responsableDeIva');
  return valor;
}

function correoDe(valor: unknown): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (!textoCorto(valor, LARGO_MAXIMO_DE_TEXTO)) throw campoInvalido('correo');
  return valor;
}

function direccionDe(valor: unknown): Direccion | null {
  if (valor === undefined || valor === null) return null;
  const { codigoMunicipio, ciudad, departamento, linea } = camposDe(valor);
  const textos = [codigoMunicipio, ciudad, departamento, linea];
  if (!textos.every((t) => textoCorto(t, LARGO_MAXIMO_DE_TEXTO))) throw campoInvalido('direccion');
  return { codigoMunicipio: codigoMunicipio as string, ciudad: ciudad as string, departamento: departamento as string, linea: linea as string };
}
