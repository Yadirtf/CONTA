import { Controller, Header, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { EnviarCorreosPendientes } from '../../aplicacion/comandos/enviar-correos-pendientes.js';
import { CompletarEmisionesPendientes } from '../../aplicacion/comandos/completar-emisiones-pendientes.js';
import { type ResumenDelLote, ProcesarTrabajosVencidos } from '../../aplicacion/comandos/procesar-trabajos-vencidos.js';
import { GuardaDeTrabajosInternos } from './guarda-de-trabajos-internos.js';

/**
 * Endpoint interno que recupera los trabajos con la DIAN vencidos (por ejemplo tras reiniciar la API): primero las
 * ventas que quedaron sin firmar (HU-06.01), después los envíos y al final los correos de las facturas aceptadas (HU-06.08).
 * Lo llama el despertador de Cloudflare. No es parte del contrato público: queda fuera de OpenAPI.
 */
@ApiExcludeController()
@Controller('interno/trabajos')
@UseGuards(GuardaDeTrabajosInternos)
export class TrabajosInternosController {
  constructor(
    private readonly completarEmisiones: CompletarEmisionesPendientes,
    private readonly procesarTrabajosVencidos: ProcesarTrabajosVencidos,
    private readonly enviarCorreos: EnviarCorreosPendientes,
  ) {}

  @Post('procesar')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async procesar(): Promise<ResumenDelLote & { emisiones: ResumenDelLote; correos: ResumenDelLote }> {
    const emisiones = await this.completarEmisiones.ejecutar();
    const envios = await this.procesarTrabajosVencidos.ejecutar();
    return { ...envios, emisiones, correos: await this.enviarCorreos.ejecutar() };
  }
}
