import { Module } from '@nestjs/common';
import { PersistenciaModule } from './compartido/infraestructura/persistencia/persistencia.module.js';
import { EmpresasModule } from './modulos/empresas/index.js';
import { FacturacionModule } from './modulos/facturacion/index.js';
import { IdentidadModule } from './modulos/identidad/index.js';
import { SaludModule } from './modulos/salud/index.js';

@Module({
  imports: [PersistenciaModule, SaludModule, IdentidadModule, EmpresasModule, FacturacionModule],
})
export class AppModule {}
