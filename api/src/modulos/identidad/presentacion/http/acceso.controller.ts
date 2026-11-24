import { Body, Controller, Delete, Get, Header, HttpCode, Post, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CerrarSesion } from '../../aplicacion/comandos/cerrar-sesion.js';
import { SolicitarCodigo } from '../../aplicacion/comandos/solicitar-codigo.js';
import { VerificarCodigo } from '../../aplicacion/comandos/verificar-codigo.js';
import type { SesionVigente } from '../../aplicacion/puertos/repositorios-de-identidad.js';
import { campoDeTexto, codigoDe, Entrar, PedirCodigo } from './cuerpos.js';
import { GuardaDeLimitePorOrigen } from './limite-por-origen.js';
import { GuardaDeSesion, SesionDeLaPeticion } from './guarda-de-sesion.js';
import { CodigoEnviado, RechazoDeAcceso, SesionAbierta, UsuarioAutenticado } from './respuestas.js';
import { TraductorDeRechazos } from './traductor-de-rechazos.js';

/** Entrar con el celular y un código (HU-04.01, ADR-0010). */
@ApiTags('acceso')
@Controller('acceso')
@UseFilters(TraductorDeRechazos)
export class AccesoController {
  constructor(
    private readonly solicitarCodigo: SolicitarCodigo,
    private readonly verificarCodigo: VerificarCodigo,
    private readonly cerrarSesion: CerrarSesion,
  ) {}

  @Post('codigos')
  @HttpCode(202)
  @UseGuards(GuardaDeLimitePorOrigen)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Envía un código de 6 dígitos al celular. Responde igual para números nuevos y registrados.' })
  @ApiBody({ type: PedirCodigo })
  @ApiAcceptedResponse({ type: CodigoEnviado })
  @ApiBadRequestResponse({ type: RechazoDeAcceso, description: 'El celular no es de Colombia o está mal escrito.' })
  @ApiTooManyRequestsResponse({ type: RechazoDeAcceso, description: 'Bloqueado, muy seguido o demasiados códigos. Trae Retry-After.' })
  @ApiServiceUnavailableResponse({ type: RechazoDeAcceso, description: 'El canal de envío no aceptó el mensaje.' })
  async pedirCodigo(@Body() cuerpo: unknown): Promise<CodigoEnviado> {
    const { venceEn, otroCodigoDesde } = await this.solicitarCodigo.ejecutar(campoDeTexto(cuerpo, 'celular'));
    return { venceEn: venceEn.toISOString(), otroCodigoDesde: otroCodigoDesde.toISOString() };
  }

  @Post('sesiones')
  @UseGuards(GuardaDeLimitePorOrigen)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Verifica el código y abre una sesión. La primera vez registra a la persona.' })
  @ApiBody({ type: Entrar })
  @ApiCreatedResponse({ type: SesionAbierta })
  @ApiBadRequestResponse({ type: RechazoDeAcceso })
  @ApiUnauthorizedResponse({ type: RechazoDeAcceso, description: 'Código incorrecto (con intentos restantes), vencido o ya usado.' })
  @ApiTooManyRequestsResponse({ type: RechazoDeAcceso, description: 'Celular bloqueado 15 minutos tras 5 fallos.' })
  async entrar(@Body() cuerpo: unknown): Promise<SesionAbierta> {
    const sesion = await this.verificarCodigo.ejecutar(campoDeTexto(cuerpo, 'celular'), codigoDe(cuerpo));
    return {
      token: sesion.token,
      venceEn: sesion.venceEn.toISOString(),
      usuario: { id: sesion.usuario.id.valor, celular: sesion.usuario.celular.e164 },
      nuevo: sesion.nuevo,
    };
  }

  @Get('yo')
  @UseGuards(GuardaDeSesion)
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quién es la persona de la sesión.' })
  @ApiOkResponse({ type: UsuarioAutenticado })
  @ApiUnauthorizedResponse({ description: 'Sin sesión, vencida o cerrada.' })
  yo(@SesionDeLaPeticion() { usuario }: SesionVigente): UsuarioAutenticado {
    return { id: usuario.id.valor, celular: usuario.celular.e164 };
  }

  @Delete('sesiones/actual')
  @HttpCode(204)
  @UseGuards(GuardaDeSesion)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cierra la sesión de este dispositivo.' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Sin sesión, vencida o cerrada.' })
  salir(@SesionDeLaPeticion() { sesion }: SesionVigente): Promise<void> {
    return this.cerrarSesion.ejecutar(sesion.id);
  }
}
