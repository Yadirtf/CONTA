import { Controller, Get, Module, Post, UseGuards } from '@nestjs/common';
import { Permiso } from '../../../src/compartido/dominio/index.js';
import { GuardaDeEmpresa, Requiere } from '../../../src/compartido/presentacion/empresa/index.js';
import { EmpresasModule } from '../../../src/modulos/empresas/index.js';

// Endpoints que solo existen en las pruebas e2e de HU-04.03. Los informes (EP-16) y la anulación (EP-06)
// todavía no existen; estos ocupan su lugar con el mismo permiso y la misma guarda que usarán los reales.
@Controller('pruebas')
@UseGuards(GuardaDeEmpresa)
class EndpointsProtegidosController {
  @Get('informes')
  @Requiere(Permiso.VerInformes)
  informes() {
    return { informe: 'ganancias del mes' };
  }

  @Post('anulaciones')
  @Requiere(Permiso.AnularDocumentos)
  anular() {
    return { anulado: true };
  }

  @Post('ventas')
  @Requiere(Permiso.Vender)
  vender() {
    return { vendido: true };
  }

  // Sin @Requiere: la guarda lo niega aunque pida el dueño (se niega por defecto).
  @Get('sin-permiso-declarado')
  olvidado() {
    return { fuga: true };
  }
}

@Module({ imports: [EmpresasModule], controllers: [EndpointsProtegidosController] })
export class EndpointsProtegidosModule {}
