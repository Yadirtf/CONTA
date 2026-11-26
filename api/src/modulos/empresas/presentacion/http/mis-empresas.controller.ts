import { Body, Controller, Get, Header, Post, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GuardaDeSesion, SesionDeLaPeticion, type SesionVigente } from '../../../identidad/index.js';
import { CrearEmpresa } from '../../aplicacion/comandos/crear-empresa.js';
import { ListarMisEmpresas } from '../../aplicacion/consultas/listar-mis-empresas.js';
import { NuevaEmpresa, razonSocialDe } from './cuerpos.js';
import { RespuestaMiEmpresa, respuestaDeMiEmpresa } from './respuesta-empresa.js';
import { TraductorDeErroresDeEmpresa } from './traductor-de-errores.js';

/** Las empresas de la persona, con su rol y su modo: listarlas para elegir y crear una nueva (HU-04.02, HU-04.03). Solo pide sesión. */
@ApiTags('empresas')
@ApiBearerAuth()
@Controller('empresas')
@UseGuards(GuardaDeSesion)
@UseFilters(TraductorDeErroresDeEmpresa)
export class MisEmpresasController {
  constructor(
    private readonly listarMisEmpresas: ListarMisEmpresas,
    private readonly crearEmpresa: CrearEmpresa,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Empresas de la persona de la sesión, por razón social, con rol, modo, permisos e invitaciones pendientes.' })
  @ApiOkResponse({ type: [RespuestaMiEmpresa] })
  @ApiUnauthorizedResponse({ description: 'Sin sesión, vencida o cerrada.' })
  async listar(@SesionDeLaPeticion() { usuario }: SesionVigente): Promise<RespuestaMiEmpresa[]> {
    return (await this.listarMisEmpresas.ejecutar(usuario.id)).map(respuestaDeMiEmpresa);
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Crea una empresa; quien la crea queda como dueño.' })
  @ApiBody({ type: NuevaEmpresa })
  @ApiCreatedResponse({ type: RespuestaMiEmpresa })
  @ApiBadRequestResponse({ description: 'Razón social vacía o de más de 450 caracteres.' })
  @ApiConflictResponse({ description: 'La persona ya lleva el máximo de empresas (empresa.limite).' })
  @ApiUnauthorizedResponse({ description: 'Sin sesión, vencida o cerrada.' })
  async crear(@SesionDeLaPeticion() { usuario }: SesionVigente, @Body() cuerpo: unknown): Promise<RespuestaMiEmpresa> {
    return respuestaDeMiEmpresa(await this.crearEmpresa.ejecutar(usuario.id, razonSocialDe(cuerpo)));
  }
}
