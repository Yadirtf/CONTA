import { Controller, Header, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { type ResumenDelLote, ProcesarTrabajosVencidos } from '../../aplicacion/comandos/procesar-trabajos-vencidos.js';
import { GuardaDeTrabajosInternos } from './guarda-de-trabajos-internos.js';

/**
 * Endpoint interno que recupera los trabajos con la DIAN vencidos (por ejemplo tras reiniciar la API).
 * Lo llama el despertador de Cloudflare. No es parte del contrato público: queda fuera de OpenAPI.
 */
@ApiExcludeController()
@Controller('interno/trabajos')
@UseGuards(GuardaDeTrabajosInternos)
export class TrabajosInternosController {
  constructor(private readonly procesarTrabajosVencidos: ProcesarTrabajosVencidos) {}

  @Post('procesar')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  procesar(): Promise<ResumenDelLote> {
    return this.procesarTrabajosVencidos.ejecutar();
  }
}
