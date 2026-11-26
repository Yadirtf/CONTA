import { Body, Controller, Get, Header, HttpCode, Post, Query, Res, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { ContextoDeMiembro } from '../../../../compartido/aplicacion/index.js';
import { Permiso } from '../../../../compartido/dominio/index.js';
import { EmpresaDeLaPeticion, GuardaDeEmpresa, Requiere } from '../../../../compartido/presentacion/empresa/index.js';
import { CrearProducto } from '../../aplicacion/comandos/crear-producto.js';
import { BuscarProductos } from '../../aplicacion/consultas/buscar-productos.js';
import { textoDeBusquedaDe } from './busqueda-de-productos.js';
import { NuevoProducto } from './cuerpo-de-producto.js';
import { productoNuevoDe } from './lectura-de-producto.js';
import { respuestaDeProducto, RespuestaListaDeProductos, RespuestaProducto } from './respuesta-producto.js';
import { TraductorDeErroresDeCatalogo } from './traductor-de-errores.js';

interface RespuestaConEstado {
  status(codigo: number): unknown;
}

/**
 * Productos de la empresa elegida en X-Empresa (HU-05.02). Listarlos es parte de vender (Permiso.Vender, también
 * el cajero); crearlos fija precios e IVA y pide Permiso.GestionarProductos (dueño y contador).
 */
@ApiTags('productos')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Empresa', required: true, description: 'Id de la empresa en la que se trabaja.' })
@ApiForbiddenResponse({ description: 'El rol no tiene el permiso (permiso.denegado: «No tienes permiso»).' })
@Controller('productos')
@UseGuards(GuardaDeEmpresa)
@UseFilters(TraductorDeErroresDeCatalogo)
export class ProductosController {
  constructor(
    private readonly buscarProductos: BuscarProductos,
    private readonly crearProducto: CrearProducto,
  ) {}

  @Get()
  @Requiere(Permiso.Vender)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Lista productos por parte del nombre (sin importar tildes) o el comienzo del código.' })
  @ApiQuery({ name: 'buscar', required: false, description: 'Vacío: los primeros 50 por nombre.' })
  @ApiOkResponse({ type: RespuestaListaDeProductos })
  async listar(@EmpresaDeLaPeticion() miembro: ContextoDeMiembro, @Query('buscar') buscar: unknown): Promise<RespuestaListaDeProductos> {
    const productos = await this.buscarProductos.ejecutar(miembro, textoDeBusquedaDe(buscar));
    return { productos: productos.map(respuestaDeProducto) };
  }

  @Post()
  @Requiere(Permiso.GestionarProductos)
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Crea un producto con su precio e IVA. Repetir el mismo id devuelve el guardado (200).' })
  @ApiBody({ type: NuevoProducto })
  @ApiCreatedResponse({ type: RespuestaProducto, description: 'Creado.' })
  @ApiOkResponse({ type: RespuestaProducto, description: 'Ya existía con ese id: el guardado, sin cambios.' })
  @ApiConflictResponse({ description: 'El código ya es de otro producto (producto.codigo-en-uso).' })
  @ApiTooManyRequestsResponse({ description: 'Tope de productos nuevos del día (producto.limite-diario).' })
  async crear(
    @EmpresaDeLaPeticion() miembro: ContextoDeMiembro,
    @Body() cuerpo: unknown,
    @Res({ passthrough: true }) respuesta: RespuestaConEstado,
  ): Promise<RespuestaProducto> {
    const { producto, creado } = await this.crearProducto.ejecutar(miembro, productoNuevoDe(cuerpo));
    respuesta.status(creado ? 201 : 200);
    return respuestaDeProducto(producto);
  }
}
