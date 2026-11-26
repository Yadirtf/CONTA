import { Body, Controller, Get, Header, HttpCode, Post, Res, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { ContextoDeMiembro } from '../../../../compartido/aplicacion/index.js';
import { Permiso } from '../../../../compartido/dominio/index.js';
import { EmpresaDeLaPeticion, GuardaDeEmpresa, Requiere } from '../../../../compartido/presentacion/empresa/index.js';
import { CrearCliente } from '../../aplicacion/comandos/crear-cliente.js';
import { BuscarClientes } from '../../aplicacion/consultas/buscar-clientes.js';
import { Busqueda, documentoDe } from './cuerpo-de-busqueda.js';
import { NuevoCliente } from './cuerpo-de-cliente.js';
import { LimiteDeBusquedas } from './limite-de-busquedas.js';
import { clienteNuevoDe } from './lectura-de-cliente.js';
import {
  RespuestaBusqueda,
  RespuestaCliente,
  respuestaDeBusqueda,
  respuestaDeCliente,
  respuestaDeConsumidorFinal,
} from './respuesta-cliente.js';
import { TraductorDeErroresDeCatalogo } from './traductor-de-errores.js';

interface RespuestaConEstado {
  status(codigo: number): unknown;
}

/**
 * Compradores de la empresa elegida en X-Empresa (HU-05.01). Buscar y crear son parte de vender: los pide
 * Permiso.Vender, que tiene también el cajero. Las respuestas llevan datos personales: nunca se guardan en caché.
 */
@ApiTags('clientes')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Empresa', required: true, description: 'Id de la empresa en la que se trabaja.' })
@ApiForbiddenResponse({ description: 'El rol no tiene el permiso (permiso.denegado: «No tienes permiso»).' })
@Controller('clientes')
@UseGuards(GuardaDeEmpresa)
@UseFilters(TraductorDeErroresDeCatalogo)
export class ClientesController {
  constructor(
    private readonly buscarClientes: BuscarClientes,
    private readonly crearCliente: CrearCliente,
    private readonly limiteDeBusquedas: LimiteDeBusquedas,
  ) {}

  @Post('busqueda')
  @Requiere(Permiso.Vender)
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Busca compradores por el comienzo de su documento y calcula el dígito de verificación si es un NIT.' })
  @ApiBody({ type: Busqueda })
  @ApiOkResponse({ type: RespuestaBusqueda })
  @ApiTooManyRequestsResponse({ description: 'Demasiadas búsquedas seguidas (cliente.limite-de-busquedas).' })
  async buscar(@EmpresaDeLaPeticion() miembro: ContextoDeMiembro, @Body() cuerpo: unknown): Promise<RespuestaBusqueda> {
    this.limiteDeBusquedas.exigir(miembro);
    return respuestaDeBusqueda(await this.buscarClientes.ejecutar(miembro, documentoDe(cuerpo)));
  }

  @Get('consumidor-final')
  @Requiere(Permiso.Vender)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'El comprador «consumidor final» de la DIAN, para quien no pide factura a su nombre.' })
  @ApiOkResponse({ type: RespuestaCliente })
  consumidorFinal(): RespuestaCliente {
    return respuestaDeConsumidorFinal();
  }

  @Post()
  @Requiere(Permiso.Vender)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Crea un comprador. Si su documento ya existe, devuelve el guardado (200) sin cambiarlo.' })
  @ApiBody({ type: NuevoCliente })
  @ApiCreatedResponse({ type: RespuestaCliente, description: 'Creado.' })
  @ApiOkResponse({ type: RespuestaCliente, description: 'Ya existía un comprador con ese documento.' })
  @ApiConflictResponse({ description: 'El id ya es de otro comprador (cliente.id-en-uso).' })
  @ApiTooManyRequestsResponse({ description: 'Tope de compradores nuevos del día (cliente.limite-diario).' })
  async crear(
    @EmpresaDeLaPeticion() miembro: ContextoDeMiembro,
    @Body() cuerpo: unknown,
    @Res({ passthrough: true }) respuesta: RespuestaConEstado,
  ): Promise<RespuestaCliente> {
    const { cliente, creado } = await this.crearCliente.ejecutar(miembro, clienteNuevoDe(cuerpo));
    respuesta.status(creado ? 201 : 200);
    return respuestaDeCliente(cliente);
  }
}
