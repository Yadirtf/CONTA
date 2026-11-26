import { Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { ContextoEmpresa } from '../../../../compartido/aplicacion/index.js';
import { IdEmpresa } from '../../../../compartido/dominio/index.js';
import { EmpresaDeLaPeticion, GuardaDeEmpresa } from '../../../../compartido/presentacion/empresa/index.js';
import { ObtenerEmpresa } from '../../aplicacion/consultas/obtener-empresa.js';
import { RespuestaEmpresa, respuestaDe } from './respuesta-empresa.js';

/** Datos dentro de una empresa: la petición dice cuál con X-Empresa y debe pertenecer a ella (HU-04.02). */
@ApiTags('empresas')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Empresa', required: true, description: 'Id de la empresa en la que se trabaja.' })
@Controller('empresas')
@UseGuards(GuardaDeEmpresa)
export class EmpresasController {
  constructor(private readonly obtenerEmpresa: ObtenerEmpresa) {}

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Datos de la empresa. Solo responde por la empresa elegida en X-Empresa.' })
  @ApiOkResponse({ type: RespuestaEmpresa })
  @ApiBadRequestResponse({ description: 'Falta X-Empresa (empresa.sin-elegir).' })
  @ApiNotFoundResponse({ description: 'No existe, es de otra empresa o la persona no es miembro: la API no distingue.' })
  @ApiUnauthorizedResponse({ description: 'Sin sesión, vencida o cerrada.' })
  async obtener(
    @EmpresaDeLaPeticion() contexto: ContextoEmpresa,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RespuestaEmpresa> {
    const empresa = await this.obtenerEmpresa.ejecutar(contexto, IdEmpresa.de(id));
    if (!empresa) throw new NotFoundException();
    return respuestaDe(empresa);
  }
}
