import { Body, Controller, Get, Header, HttpCode, NotFoundException, Param, Post, Res, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { ContextoDeMiembro } from '../../../../../compartido/aplicacion/index.js';
import { Permiso } from '../../../../../compartido/dominio/index.js';
import { EmpresaDeLaPeticion, GuardaDeEmpresa, Requiere } from '../../../../../compartido/presentacion/empresa/index.js';
import { RegistrarVenta } from '../../../aplicacion/comandos/registrar-venta.js';
import { ConsultarVenta } from '../../../aplicacion/consultas/consultar-venta.js';
import { NuevaVenta } from './cuerpo-de-venta.js';
import { pedidoDe } from './lectura-de-venta.js';
import { respuestaDeVenta, RespuestaVenta } from './respuesta-venta.js';
import { TraductorDeErroresDeVentas } from './traductor-de-errores-de-ventas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface RespuestaConEstado {
  status(codigo: number): unknown;
}

/**
 * Ventas de la empresa elegida en X-Empresa (HU-06.01). Vender es Permiso.Vender (dueño, contador y cajero). La
 * respuesta llega cuando la venta ya está guardada con su número; el envío a la DIAN sigue solo.
 */
@ApiTags('ventas')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Empresa', required: true, description: 'Id de la empresa en la que se trabaja.' })
@ApiForbiddenResponse({ description: 'El rol no tiene el permiso (permiso.denegado: «No tienes permiso»).' })
@Controller('ventas')
@UseGuards(GuardaDeEmpresa)
@UseFilters(TraductorDeErroresDeVentas)
export class VentasController {
  constructor(
    private readonly registrarVenta: RegistrarVenta,
    private readonly consultarVenta: ConsultarVenta,
  ) {}

  @Post()
  @Requiere(Permiso.Vender)
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Registra una venta y emite su factura. Repetir el mismo id con lo mismo devuelve la guardada (200).' })
  @ApiBody({ type: NuevaVenta })
  @ApiCreatedResponse({ type: RespuestaVenta, description: 'Guardada con su número; la factura va a la DIAN.' })
  @ApiOkResponse({ type: RespuestaVenta, description: 'Ya existía con ese id y ese pedido: la guardada, sin cambios.' })
  @ApiConflictResponse({
    description: 'El id es de otra venta (venta.id-en-uso), el negocio no está habilitado (facturacion.no-habilitada) o no hay números (facturacion.sin-numeracion).',
  })
  @ApiUnprocessableEntityResponse({ description: 'Un producto o el comprador no son del negocio.' })
  @ApiTooManyRequestsResponse({ description: 'Tope de ventas del día de la empresa o de la persona.' })
  async crear(
    @EmpresaDeLaPeticion() miembro: ContextoDeMiembro,
    @Body() cuerpo: unknown,
    @Res({ passthrough: true }) respuesta: RespuestaConEstado,
  ): Promise<RespuestaVenta> {
    const { ventaId, nueva } = await this.registrarVenta.ejecutar(miembro, pedidoDe(cuerpo));
    respuesta.status(nueva ? 201 : 200);
    return respuestaDeVenta(await this.consultarVenta.ejecutar(miembro, ventaId));
  }

  @Get(':id')
  @Requiere(Permiso.Vender)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Una venta con su estado ante la DIAN, en palabras del modo simple.' })
  @ApiOkResponse({ type: RespuestaVenta })
  @ApiNotFoundResponse({ description: 'No es una venta de este negocio (venta.no-encontrada).' })
  async obtener(
    @EmpresaDeLaPeticion() miembro: ContextoDeMiembro,
    @Param('id') id: string,
  ): Promise<RespuestaVenta> {
    // Un id que no es UUID no puede ser una venta: 404, igual que el de otra empresa (no se distingue).
    if (!UUID.test(id)) throw new NotFoundException({ codigo: 'venta.no-encontrada', mensaje: 'No encontramos esa venta' });
    return respuestaDeVenta(await this.consultarVenta.ejecutar(miembro, id));
  }
}
