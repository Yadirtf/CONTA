import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { FiltroDeFallas } from './compartido/presentacion/fallas/filtro-de-fallas.js';
import { PersistenciaModule } from './compartido/infraestructura/persistencia/persistencia.module.js';
import { CatalogoModule } from './modulos/catalogo/index.js';
import { EmpresasModule } from './modulos/empresas/index.js';
import { FacturacionModule } from './modulos/facturacion/index.js';
import { IdentidadModule } from './modulos/identidad/index.js';
import { SaludModule } from './modulos/salud/index.js';

@Module({
  imports: [PersistenciaModule, SaludModule, IdentidadModule, EmpresasModule, CatalogoModule, FacturacionModule],
  // Ninguna falla inesperada llega al registro con los datos de la consulta (prueba de ataque de HU-05.01).
  providers: [{ provide: APP_FILTER, useClass: FiltroDeFallas }],
})
export class AppModule {}
