import { ApiProperty } from '@nestjs/swagger';
import { MODOS, type Modo, Permiso, permisosDe, type Rol, ROLES } from '../../../../compartido/dominio/index.js';
import type { MiEmpresa } from '../../aplicacion/puertos/repositorio-de-mis-empresas.js';
import type { Empresa } from '../../dominio/empresa.js';

export class RespuestaEmpresa {
  @ApiProperty({ format: 'uuid' })
  readonly id!: string;

  @ApiProperty({ example: 'Tienda Doña Rosa S.A.S.' })
  readonly razonSocial!: string;
}

/** Una empresa de la persona con su membresía: el modo y los permisos los decide la API, no la app (HU-04.03). */
export class RespuestaMiEmpresa extends RespuestaEmpresa {
  @ApiProperty({ enum: ROLES })
  readonly rol!: Rol;

  @ApiProperty({ enum: MODOS, description: 'Cara con que la app muestra la empresa. No da permisos.' })
  readonly modo!: Modo;

  @ApiProperty({ enum: ['invitada', 'activa'], description: 'invitada: hay que aceptarla antes de entrar.' })
  readonly estado!: 'invitada' | 'activa';

  @ApiProperty({ enum: Object.values(Permiso), isArray: true, description: 'Lo que el rol deja hacer; sirve para mostrar u ocultar acciones.' })
  readonly permisos!: Permiso[];
}

export const respuestaDe = (empresa: Empresa): RespuestaEmpresa => ({ id: empresa.id.valor, razonSocial: empresa.razonSocial });

export const respuestaDeMiEmpresa = ({ empresa, rol, modo, estado }: MiEmpresa): RespuestaMiEmpresa => ({
  ...respuestaDe(empresa),
  rol,
  modo,
  estado,
  permisos: permisosDe(rol),
});
