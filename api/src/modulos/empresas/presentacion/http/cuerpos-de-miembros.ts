import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { esModo, esRol, MODOS, type Modo, type Rol, ROLES } from '../../../../compartido/dominio/index.js';
import type { CambioDeMembresia } from '../../aplicacion/comandos/cambiar-membresia.js';
import type { Invitacion } from '../../aplicacion/comandos/invitar-miembro.js';

const LARGO_MAXIMO_DEL_CELULAR = 20;

export class NuevoMiembro {
  @ApiProperty({ example: '300 123 4567', description: 'Celular de Colombia de quien se invita.' })
  readonly celular!: string;

  @ApiProperty({ enum: ROLES, example: 'cajero' })
  readonly rol!: Rol;

  @ApiPropertyOptional({ enum: MODOS, description: 'Si no viene: contador para el rol contador, simple para los demás.' })
  readonly modo?: Modo;
}

export class CambioDeMiembro {
  @ApiPropertyOptional({ enum: ROLES })
  readonly rol?: Rol;

  @ApiPropertyOptional({ enum: MODOS })
  readonly modo?: Modo;
}

const campoInvalido = (campo: string) =>
  new BadRequestException({ codigo: 'peticion.campo-invalido', mensaje: `Revisa el campo ${campo}` });

const camposDe = (cuerpo: unknown): Record<string, unknown> =>
  typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>) : {};

/** Lee la invitación. El dominio de identidad valida el celular; aquí solo su forma. */
export function invitacionDe(cuerpo: unknown): Invitacion {
  const { celular, rol, modo } = camposDe(cuerpo);
  if (typeof celular !== 'string' || celular.length > LARGO_MAXIMO_DEL_CELULAR) throw campoInvalido('celular');
  if (!esRol(rol)) throw campoInvalido('rol');
  if (modo !== undefined && !esModo(modo)) throw campoInvalido('modo');
  return { celular, rol, modo };
}

/** Lee un cambio de rol o de modo; al menos uno de los dos. */
export function cambioDe(cuerpo: unknown): CambioDeMembresia {
  const { rol, modo } = camposDe(cuerpo);
  if (rol !== undefined && !esRol(rol)) throw campoInvalido('rol');
  if (modo !== undefined && !esModo(modo)) throw campoInvalido('modo');
  if (rol === undefined && modo === undefined) throw campoInvalido('rol o modo');
  return { rol, modo };
}
