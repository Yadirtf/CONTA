import { Body, Controller, Get, Header, Post, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ConfirmarInscripcion } from '../../../aplicacion/comandos/segundo-factor/confirmar-inscripcion.js';
import { IniciarInscripcion } from '../../../aplicacion/comandos/segundo-factor/iniciar-inscripcion.js';
import { VerificarSegundoFactor } from '../../../aplicacion/comandos/segundo-factor/verificar-segundo-factor.js';
import { ConsultarSegundoFactor } from '../../../aplicacion/consultas/estado-del-segundo-factor.js';
import type { SesionVigente } from '../../../aplicacion/puertos/repositorios-de-identidad.js';
import { GuardaDeSesion, SesionDeLaPeticion } from '../guarda-de-sesion.js';
import { GuardaDeLimitePorOrigen } from '../limite-por-origen.js';
import { RechazoDeAcceso } from '../respuestas.js';
import { TraductorDeRechazos } from '../traductor-de-rechazos.js';
import { CodigoDelSegundoFactor, codigoDelSegundoFactor } from './cuerpos.js';
import { EstadoDelSegundoFactor, InscripcionConfirmada, InscripcionIniciada, SegundoFactorVerificado } from './respuestas.js';

/**
 * Verificación en dos pasos con una app autenticadora (HU-04.04, ADR-0013). La exige la guarda de empresa a
 * quien trabaja como contador; aquí solo se configura y se verifica. Todo pide una sesión.
 */
@ApiTags('acceso')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Sin sesión, vencida o cerrada.' })
@Controller('acceso/segundo-factor')
@UseGuards(GuardaDeSesion)
@UseFilters(TraductorDeRechazos)
export class SegundoFactorController {
  constructor(
    private readonly consultar: ConsultarSegundoFactor,
    private readonly iniciarInscripcion: IniciarInscripcion,
    private readonly confirmarInscripcion: ConfirmarInscripcion,
    private readonly verificar: VerificarSegundoFactor,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Dice si la persona ya configuró su app y si esta sesión está verificada.' })
  @ApiOkResponse({ type: EstadoDelSegundoFactor })
  async estado(@SesionDeLaPeticion() sesion: SesionVigente): Promise<EstadoDelSegundoFactor> {
    const { inscrito, verificadaHasta, codigosDeRecuperacionRestantes } = await this.consultar.ejecutar(sesion);
    return { inscrito, verificadaHasta: verificadaHasta?.toISOString() ?? null, codigosDeRecuperacionRestantes };
  }

  @Post('inscripcion')
  @UseGuards(GuardaDeLimitePorOrigen)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Crea la clave de la app autenticadora. Cambiar una app existente exige haber verificado hace poco.' })
  @ApiCreatedResponse({ type: InscripcionIniciada })
  @ApiConflictResponse({ type: RechazoDeAcceso, description: 'Ya tiene app y no verificó en los últimos 10 minutos.' })
  @ApiTooManyRequestsResponse({ type: RechazoDeAcceso })
  @ApiServiceUnavailableResponse({ type: RechazoDeAcceso, description: 'Falta la clave de cifrado en el servidor.' })
  async inscribir(@SesionDeLaPeticion() sesion: SesionVigente): Promise<InscripcionIniciada> {
    const { secreto, uri, venceEn } = await this.iniciarInscripcion.ejecutar(sesion);
    return { secreto, uri, venceEn: venceEn.toISOString() };
  }

  @Post('inscripcion/confirmacion')
  @UseGuards(GuardaDeLimitePorOrigen)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Confirma la app con su primer código, verifica esta sesión y entrega los códigos de recuperación.' })
  @ApiBody({ type: CodigoDelSegundoFactor })
  @ApiCreatedResponse({ type: InscripcionConfirmada })
  @ApiBadRequestResponse({ type: RechazoDeAcceso })
  @ApiUnprocessableEntityResponse({ type: RechazoDeAcceso, description: 'Código incorrecto, con intentos restantes.' })
  @ApiConflictResponse({ type: RechazoDeAcceso, description: 'No hay una configuración pendiente o ya venció.' })
  @ApiTooManyRequestsResponse({ type: RechazoDeAcceso, description: 'Bloqueado 15 minutos tras 5 fallos.' })
  async confirmar(@SesionDeLaPeticion() sesion: SesionVigente, @Body() cuerpo: unknown): Promise<InscripcionConfirmada> {
    const confirmada = await this.confirmarInscripcion.ejecutar(sesion, codigoDelSegundoFactor(cuerpo));
    return { codigosDeRecuperacion: [...confirmada.codigosDeRecuperacion], verificadaHasta: confirmada.verificadaHasta.toISOString() };
  }

  @Post('verificacion')
  @UseGuards(GuardaDeLimitePorOrigen)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Verifica esta sesión por una jornada con un código de la app o uno de recuperación.' })
  @ApiBody({ type: CodigoDelSegundoFactor })
  @ApiCreatedResponse({ type: SegundoFactorVerificado })
  @ApiBadRequestResponse({ type: RechazoDeAcceso })
  @ApiUnprocessableEntityResponse({ type: RechazoDeAcceso, description: 'Código incorrecto o ya usado, con intentos restantes.' })
  @ApiConflictResponse({ type: RechazoDeAcceso, description: 'La persona todavía no configuró su app.' })
  @ApiTooManyRequestsResponse({ type: RechazoDeAcceso, description: 'Bloqueado 15 minutos tras 5 fallos.' })
  async verificarCodigo(@SesionDeLaPeticion() sesion: SesionVigente, @Body() cuerpo: unknown): Promise<SegundoFactorVerificado> {
    const verificado = await this.verificar.ejecutar(sesion, codigoDelSegundoFactor(cuerpo));
    return { ...verificado, verificadaHasta: verificado.verificadaHasta.toISOString() };
  }
}
