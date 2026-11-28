import { Body, Controller, Get, Header, HttpCode, Param, Post, Put, Res, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { ContextoDeMiembro } from '../../../../../compartido/aplicacion/index.js';
import { Permiso } from '../../../../../compartido/dominio/index.js';
import { EmpresaDeLaPeticion, GuardaDeEmpresa, Requiere } from '../../../../../compartido/presentacion/empresa/index.js';
import { AgregarResolucion } from '../../../aplicacion/configuracion/agregar-resolucion.js';
import { GuardarDatosFiscales } from '../../../aplicacion/configuracion/guardar-datos-fiscales.js';
import { GuardarPreferencias } from '../../../aplicacion/configuracion/guardar-preferencias.js';
import { GuardarSoftware } from '../../../aplicacion/configuracion/guardar-software.js';
import { ObtenerConfiguracionDian } from '../../../aplicacion/configuracion/obtener-configuracion-dian.js';
import { DatosFiscalesNuevos, PreferenciasNuevas, ResolucionPorAgregar, SoftwareNuevo } from './cuerpos-de-configuracion.js';
import { camposDe, siNo } from './lectura-comun.js';
import { datosFiscalesDe } from './lectura-de-datos-fiscales.js';
import { claseDe, resolucionDe } from './lectura-de-resolucion.js';
import { softwareDe } from './lectura-de-software.js';
import { type ConCabeceras, LimiteDeCambiosDeConfiguracion } from './limite-de-cambios.js';
import { ConfiguracionDianRespuesta, respuestaDeConfiguracion } from './respuesta-configuracion.js';
import { TraductorDeErroresDeConfiguracion } from './traductor-de-errores-de-configuracion.js';

interface RespuestaConEstado extends ConCabeceras {
  status(codigo: number): unknown;
}

/**
 * Configuración DIAN de la empresa elegida en X-Empresa (HU-07.04): datos fiscales, resoluciones, software por clase de
 * documento y «siempre factura». Solo el dueño (Permiso.ConfigurarFacturacion); leer pide la verificación en dos pasos
 * de la jornada y cambiar, una de hace 10 minutos o menos (lo revisa cada caso de uso). Las respuestas nunca llevan el
 * PIN ni la clave técnica, y no se guardan en caché.
 */
@ApiTags('configuracion-dian')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Empresa', required: true, description: 'Id de la empresa en la que se trabaja.' })
@ApiForbiddenResponse({
  description:
    'No es el dueño (permiso.denegado), no pasó la verificación en dos pasos (acceso.segundo-factor-requerido) o, para cambiar, no la pasó hace poco (acceso.segundo-factor-reciente-requerido).',
})
@ApiTooManyRequestsResponse({ description: 'Más de 30 cambios de la empresa en 10 minutos (configuracion.limite).' })
@ApiServiceUnavailableResponse({ description: 'El servidor no tiene la clave para cifrar datos reservados (configuracion.no-disponible).' })
@Controller('configuracion-dian')
@UseGuards(GuardaDeEmpresa)
@UseFilters(TraductorDeErroresDeConfiguracion)
@Requiere(Permiso.ConfigurarFacturacion)
export class ConfiguracionDianController {
  constructor(
    private readonly obtener: ObtenerConfiguracionDian,
    private readonly guardarDatosFiscales: GuardarDatosFiscales,
    private readonly agregarResolucion: AgregarResolucion,
    private readonly guardarSoftware: GuardarSoftware,
    private readonly guardarPreferencias: GuardarPreferencias,
    private readonly limite: LimiteDeCambiosDeConfiguracion,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Lo guardado de la configuración DIAN y lo que falta para facturar. Sin PIN ni clave técnica.' })
  @ApiOkResponse({ type: ConfiguracionDianRespuesta })
  async leer(@EmpresaDeLaPeticion() miembro: ContextoDeMiembro): Promise<ConfiguracionDianRespuesta> {
    return respuestaDeConfiguracion(await this.obtener.ejecutar(miembro), miembro.usuarioId.valor);
  }

  @Put('datos-fiscales')
  @HttpCode(204)
  @ApiOperation({ summary: 'Guarda o corrige los datos fiscales del facturador. El NIT no cambia si ya hay ventas.' })
  @ApiBody({ type: DatosFiscalesNuevos })
  @ApiNoContentResponse({ description: 'Guardados.' })
  @ApiConflictResponse({ description: 'El NIT cambiaría y ya hay ventas (configuracion.nit-con-ventas).' })
  async datosFiscales(
    @EmpresaDeLaPeticion() miembro: ContextoDeMiembro,
    @Body() cuerpo: unknown,
    @Res({ passthrough: true }) respuesta: ConCabeceras,
  ): Promise<void> {
    this.limite.exigir(miembro, respuesta);
    await this.guardarDatosFiscales.ejecutar(miembro, datosFiscalesDe(cuerpo));
  }

  @Post('resoluciones')
  @ApiOperation({ summary: 'Agrega una resolución de numeración. Una guardada nunca se edita ni se borra.' })
  @ApiBody({ type: ResolucionPorAgregar })
  @ApiCreatedResponse({ description: 'Agregada.' })
  @ApiOkResponse({ description: 'Ya existía con ese id (reintento): no se agrega otra.' })
  @ApiConflictResponse({ description: 'resolucion.id-en-uso, resolucion.repetida o resolucion.rango-cruzado.' })
  async resolucion(
    @EmpresaDeLaPeticion() miembro: ContextoDeMiembro,
    @Body() cuerpo: unknown,
    @Res({ passthrough: true }) respuesta: RespuestaConEstado,
  ): Promise<{ id: string }> {
    this.limite.exigir(miembro, respuesta);
    const { id, resolucion } = resolucionDe(cuerpo);
    respuesta.status((await this.agregarResolucion.ejecutar(miembro, id, resolucion)) ? 201 : 200);
    return { id };
  }

  @Put('software/:clase')
  @HttpCode(204)
  @ApiOperation({ summary: 'Guarda el software DIAN de una clase de documento. El PIN se escribe solo para cambiarlo.' })
  @ApiParam({ name: 'clase', enum: ['factura', 'pos'] })
  @ApiBody({ type: SoftwareNuevo })
  @ApiNoContentResponse({ description: 'Guardado.' })
  async software(
    @EmpresaDeLaPeticion() miembro: ContextoDeMiembro,
    @Param('clase') clase: string,
    @Body() cuerpo: unknown,
    @Res({ passthrough: true }) respuesta: ConCabeceras,
  ): Promise<void> {
    this.limite.exigir(miembro, respuesta);
    await this.guardarSoftware.ejecutar(miembro, softwareDe(claseDe(clase), cuerpo));
  }

  @Put('preferencias')
  @HttpCode(204)
  @ApiOperation({ summary: 'Guarda «siempre factura»: con ella nunca sale tiquete POS.' })
  @ApiBody({ type: PreferenciasNuevas })
  @ApiNoContentResponse({ description: 'Guardadas.' })
  async preferencias(
    @EmpresaDeLaPeticion() miembro: ContextoDeMiembro,
    @Body() cuerpo: unknown,
    @Res({ passthrough: true }) respuesta: ConCabeceras,
  ): Promise<void> {
    this.limite.exigir(miembro, respuesta);
    await this.guardarPreferencias.ejecutar(miembro, siNo(camposDe(cuerpo)['siempreFactura'], 'siempreFactura'));
  }
}
