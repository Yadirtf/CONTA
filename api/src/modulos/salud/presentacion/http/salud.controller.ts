import { Controller, Get, Header } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConsultarSalud } from '../../aplicacion/consultas/consultar-salud.js';
import { RespuestaSalud } from './respuesta-salud.js';

@ApiTags('salud')
@Controller('salud')
export class SaludController {
  constructor(private readonly consultarSalud: ConsultarSalud) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Indica si la API está viva. No consulta la base de datos.' })
  @ApiOkResponse({ type: RespuestaSalud })
  obtener(): RespuestaSalud {
    return this.consultarSalud.ejecutar();
  }
}
