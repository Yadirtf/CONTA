import { Controller, HttpCode, Param, ParseUUIDPipe, Post, UseFilters, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiNotFoundResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { IdEmpresa } from '../../../../compartido/dominio/index.js';
import { GuardaDeSesion, SesionDeLaPeticion, type SesionVigente } from '../../../identidad/index.js';
import { ResponderInvitacion } from '../../aplicacion/comandos/responder-invitacion.js';
import { TraductorDeErroresDeEmpresa } from './traductor-de-errores.js';

const ID_DE_EMPRESA = new ParseUUIDPipe();

/**
 * La persona invitada acepta o rechaza entrar a una empresa (HU-04.03). Solo pide sesión: todavía no es
 * miembro activo, así que no puede usar X-Empresa.
 */
@ApiTags('empresas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin sesión, vencida o cerrada.' })
@ApiNotFoundResponse({ description: 'No hay invitación pendiente para esta persona en esa empresa (invitacion.no-encontrada).' })
@Controller('empresas/:empresaId/invitacion')
@UseGuards(GuardaDeSesion)
@UseFilters(TraductorDeErroresDeEmpresa)
export class InvitacionesController {
  constructor(private readonly responderInvitacion: ResponderInvitacion) {}

  @Post('aceptar')
  @HttpCode(204)
  @ApiOperation({ summary: 'Acepta la invitación: desde ya puede trabajar en la empresa con el rol que le dieron.' })
  @ApiNoContentResponse()
  async aceptar(@SesionDeLaPeticion() { usuario }: SesionVigente, @Param('empresaId', ID_DE_EMPRESA) empresaId: string): Promise<void> {
    await this.responderInvitacion.ejecutar(usuario.id, IdEmpresa.de(empresaId), 'aceptar');
  }

  @Post('rechazar')
  @HttpCode(204)
  @ApiOperation({ summary: 'Rechaza la invitación: la empresa deja de aparecer en su lista.' })
  @ApiNoContentResponse()
  async rechazar(@SesionDeLaPeticion() { usuario }: SesionVigente, @Param('empresaId', ID_DE_EMPRESA) empresaId: string): Promise<void> {
    await this.responderInvitacion.ejecutar(usuario.id, IdEmpresa.de(empresaId), 'rechazar');
  }
}
