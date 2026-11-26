import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { ContextoDeMiembro } from '../../../../compartido/aplicacion/index.js';
import { IdUsuario, Permiso } from '../../../../compartido/dominio/index.js';
import { EmpresaDeLaPeticion, GuardaDeEmpresa, Requiere } from '../../../../compartido/presentacion/empresa/index.js';
import { CambiarMembresia } from '../../aplicacion/comandos/cambiar-membresia.js';
import { InvitarMiembro } from '../../aplicacion/comandos/invitar-miembro.js';
import { RetirarMiembro } from '../../aplicacion/comandos/retirar-miembro.js';
import { ListarMiembros } from '../../aplicacion/consultas/listar-miembros.js';
import { CambioDeMiembro, cambioDe, invitacionDe, NuevoMiembro } from './cuerpos-de-miembros.js';
import {
  RespuestaCambioDeMiembro,
  RespuestaMiembro,
  respuestaDeCambio,
  respuestaDeMiembro,
} from './respuesta-miembro.js';
import { TraductorDeErroresDeEmpresa } from './traductor-de-errores.js';

const ID_DE_PERSONA = new ParseUUIDPipe();

/** Las personas de la empresa elegida en X-Empresa: invitarlas, cambiar su rol o modo y retirarlas (HU-04.03). */
@ApiTags('miembros')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Empresa', required: true, description: 'Id de la empresa en la que se trabaja.' })
@ApiForbiddenResponse({ description: 'El rol no tiene el permiso (permiso.denegado: «No tienes permiso»).' })
@Controller('miembros')
@UseGuards(GuardaDeEmpresa)
@UseFilters(TraductorDeErroresDeEmpresa)
export class MiembrosController {
  constructor(
    private readonly listarMiembros: ListarMiembros,
    private readonly invitarMiembro: InvitarMiembro,
    private readonly cambiarMembresia: CambiarMembresia,
    private readonly retirarMiembro: RetirarMiembro,
  ) {}

  @Get()
  @Requiere(Permiso.GestionarMiembros)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Personas invitadas y activas de la empresa.' })
  @ApiOkResponse({ type: [RespuestaMiembro] })
  async listar(@EmpresaDeLaPeticion() miembro: ContextoDeMiembro): Promise<RespuestaMiembro[]> {
    return (await this.listarMiembros.ejecutar(miembro)).map(respuestaDeMiembro);
  }

  @Post()
  @Requiere(Permiso.GestionarMiembros)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Invita a una persona por su celular; entra cuando acepta la invitación.' })
  @ApiBody({ type: NuevoMiembro })
  @ApiCreatedResponse({ type: RespuestaMiembro })
  @ApiConflictResponse({ description: 'Ya está o ya tiene invitación (miembro.ya-esta), o la empresa llegó al tope (miembro.limite).' })
  @ApiTooManyRequestsResponse({ description: 'Tope de invitaciones del día (miembro.limite-diario).' })
  async invitar(@EmpresaDeLaPeticion() miembro: ContextoDeMiembro, @Body() cuerpo: unknown): Promise<RespuestaMiembro> {
    return respuestaDeMiembro(await this.invitarMiembro.ejecutar(miembro, invitacionDe(cuerpo)));
  }

  @Patch(':usuarioId')
  @Requiere(Permiso.GestionarMiembros)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Cambia el rol o el modo de una persona. Nadie cambia su propio rol.' })
  @ApiBody({ type: CambioDeMiembro })
  @ApiOkResponse({ type: RespuestaCambioDeMiembro })
  @ApiNotFoundResponse({ description: 'La persona no está en la empresa (miembro.no-encontrado).' })
  @ApiConflictResponse({ description: 'Es su propio rol (miembro.sobre-si-mismo) o dejaría la empresa sin dueño (miembro.ultimo-dueno).' })
  async cambiar(
    @EmpresaDeLaPeticion() miembro: ContextoDeMiembro,
    @Param('usuarioId', ID_DE_PERSONA) usuarioId: string,
    @Body() cuerpo: unknown,
  ): Promise<RespuestaCambioDeMiembro> {
    return respuestaDeCambio(await this.cambiarMembresia.ejecutar(miembro, IdUsuario.de(usuarioId), cambioDe(cuerpo)));
  }

  // VerEmpresa y no GestionarMiembros: cada persona puede salirse. El caso de uso exige GestionarMiembros si
  // retira a otra.
  @Delete(':usuarioId')
  @Requiere(Permiso.VerEmpresa)
  @HttpCode(204)
  @ApiOperation({ summary: 'Retira a una persona (o a uno mismo) sin borrar su historia. Nunca al último dueño.' })
  @ApiNoContentResponse({ description: 'Retirada: deja de ver la empresa desde la siguiente petición.' })
  @ApiNotFoundResponse({ description: 'La persona no está en la empresa (miembro.no-encontrado).' })
  @ApiConflictResponse({ description: 'Es el último dueño (miembro.ultimo-dueno).' })
  async retirar(@EmpresaDeLaPeticion() miembro: ContextoDeMiembro, @Param('usuarioId', ID_DE_PERSONA) usuarioId: string): Promise<void> {
    await this.retirarMiembro.ejecutar(miembro, IdUsuario.de(usuarioId));
  }
}
