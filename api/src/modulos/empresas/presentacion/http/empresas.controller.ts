import { Controller, Get, Header, NotFoundException, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { ContextoEmpresa } from '../../../../compartido/aplicacion/index.js';
import { IdEmpresa } from '../../../../compartido/dominio/index.js';
import { EmpresaDeLaPeticion, GuardaDeEmpresa } from '../../../../compartido/presentacion/empresa/index.js';
import { ObtenerEmpresa } from '../../aplicacion/consultas/obtener-empresa.js';
import { RespuestaEmpresa } from './respuesta-empresa.js';

@ApiTags('empresas')
@Controller('empresas')
@UseGuards(GuardaDeEmpresa)
export class EmpresasController {
  constructor(private readonly obtenerEmpresa: ObtenerEmpresa) {}

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Datos de la empresa. Solo responde por la empresa de quien pregunta.' })
  @ApiOkResponse({ type: RespuestaEmpresa })
  @ApiNotFoundResponse({ description: 'No existe o es de otra empresa: la API no distingue los dos casos.' })
  @ApiUnauthorizedResponse({ description: 'La petición no pertenece a ninguna empresa.' })
  async obtener(
    @EmpresaDeLaPeticion() contexto: ContextoEmpresa,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<RespuestaEmpresa> {
    const empresa = await this.obtenerEmpresa.ejecutar(contexto, IdEmpresa.de(id));
    if (!empresa) throw new NotFoundException();
    return { id: empresa.id.valor, razonSocial: empresa.razonSocial };
  }
}
