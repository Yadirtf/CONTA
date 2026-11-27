import { Controller, Get, Header, NotFoundException, Param, Res, StreamableFile, UseFilters, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { ContextoDeMiembro } from '../../../../../compartido/aplicacion/index.js';
import { Permiso } from '../../../../../compartido/dominio/index.js';
import { EmpresaDeLaPeticion, GuardaDeEmpresa, Requiere } from '../../../../../compartido/presentacion/empresa/index.js';
import { ObtenerComprobante } from '../../../aplicacion/consultas/obtener-comprobante.js';
import { LimiteDeComprobantes } from './limite-de-comprobantes.js';
import { TraductorDeErroresDeVentas } from './traductor-de-errores-de-ventas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * El PDF de la factura para compartirlo por WhatsApp (HU-06.08). No hay enlace público: solo esta descarga con
 * sesión, X-Empresa y Permiso.Vender, y la respuesta no se guarda en ninguna caché.
 */
@ApiTags('ventas')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Empresa', required: true, description: 'Id de la empresa en la que se trabaja.' })
@ApiForbiddenResponse({ description: 'El rol no tiene el permiso (permiso.denegado).' })
@Controller('ventas')
@UseGuards(GuardaDeEmpresa)
@UseFilters(TraductorDeErroresDeVentas)
export class ComprobanteController {
  constructor(
    private readonly obtenerComprobante: ObtenerComprobante,
    private readonly limite: LimiteDeComprobantes,
  ) {}

  @Get(':id/comprobante')
  @Requiere(Permiso.Vender)
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'El PDF de la factura con su QR, cuando la DIAN ya la aceptó.' })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'El PDF (application/pdf).', schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: 'No es una venta de este negocio (venta.no-encontrada).' })
  @ApiConflictResponse({ description: 'Todavía va para la DIAN (comprobante.en-camino) o la rechazó (comprobante.rechazado).' })
  @ApiTooManyRequestsResponse({ description: 'Muchos comprobantes seguidos (comprobante.limite). Trae Retry-After.' })
  async obtener(
    @EmpresaDeLaPeticion() miembro: ContextoDeMiembro,
    @Param('id') id: string,
    @Res({ passthrough: true }) respuesta: { setHeader(nombre: string, valor: string): unknown },
  ): Promise<StreamableFile> {
    if (!UUID.test(id)) throw new NotFoundException({ codigo: 'venta.no-encontrada', mensaje: 'No encontramos esa venta' });
    this.limite.exigir(miembro, respuesta);
    const { nombre, pdf } = await this.obtenerComprobante.ejecutar(miembro, id);
    return new StreamableFile(pdf, { type: 'application/pdf', disposition: `attachment; filename="${nombre}"`, length: pdf.length });
  }
}
