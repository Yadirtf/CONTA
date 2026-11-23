import { Module } from '@nestjs/common';
import { PersistenciaModule } from './compartido/infraestructura/persistencia/persistencia.module.js';
import { ContextoDeEmpresaModule } from './compartido/presentacion/empresa/empresa.module.js';
import { EmpresasModule } from './modulos/empresas/index.js';
import { SaludModule } from './modulos/salud/index.js';

@Module({
  imports: [PersistenciaModule, ContextoDeEmpresaModule, SaludModule, EmpresasModule],
})
export class AppModule {}
