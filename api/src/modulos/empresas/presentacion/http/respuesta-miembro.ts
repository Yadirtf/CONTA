import { ApiProperty } from '@nestjs/swagger';
import { MODOS, type Modo, type Rol, ROLES } from '../../../../compartido/dominio/index.js';
import type { MiembroConCelular } from '../../aplicacion/comandos/invitar-miembro.js';
import type { Membresia } from '../../dominio/membresia.js';

/** Una persona de la empresa, como la ve quien la gestiona. El celular va enmascarado (Ley 1581). */
export class RespuestaMiembro {
  @ApiProperty({ format: 'uuid', description: 'Id de la persona; es el que llevan las rutas /miembros/:usuarioId.' })
  readonly usuarioId!: string;

  @ApiProperty({ example: '+57 300 *** 4567' })
  readonly celular!: string;

  @ApiProperty({ enum: ROLES })
  readonly rol!: Rol;

  @ApiProperty({ enum: MODOS })
  readonly modo!: Modo;

  @ApiProperty({ enum: ['invitada', 'activa'] })
  readonly estado!: 'invitada' | 'activa';
}

/** Sin celular: para respuestas de cambios, donde quien gestiona ya lo tiene. */
export class RespuestaCambioDeMiembro {
  @ApiProperty({ format: 'uuid' })
  readonly usuarioId!: string;

  @ApiProperty({ enum: ROLES })
  readonly rol!: Rol;

  @ApiProperty({ enum: MODOS })
  readonly modo!: Modo;
}

function estadoVigente(membresia: Membresia): 'invitada' | 'activa' {
  return membresia.estado === 'invitada' ? 'invitada' : 'activa';
}

export const respuestaDeMiembro = ({ membresia, celular }: MiembroConCelular): RespuestaMiembro => ({
  usuarioId: membresia.usuarioId.valor,
  celular,
  rol: membresia.rol,
  modo: membresia.modo,
  estado: estadoVigente(membresia),
});

export const respuestaDeCambio = (membresia: Membresia): RespuestaCambioDeMiembro => ({
  usuarioId: membresia.usuarioId.valor,
  rol: membresia.rol,
  modo: membresia.modo,
});
