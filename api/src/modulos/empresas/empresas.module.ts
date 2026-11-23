import { Module } from '@nestjs/common';
import type { UnidadDeTrabajo } from '../../compartido/aplicacion/index.js';
import { BaseDeDatos } from '../../compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { ObtenerEmpresa } from './aplicacion/consultas/obtener-empresa.js';
import type { RepositoriosDeEmpresas } from './aplicacion/puertos/repositorio-empresas.js';
import { RepositorioEmpresasPostgres } from './infraestructura/persistencia/repositorio-empresas-postgres.js';
import { EmpresasController } from './presentacion/http/empresas.controller.js';

export const UNIDAD_DE_TRABAJO_EMPRESAS = Symbol('UnidadDeTrabajoEmpresas');

// Composición: único archivo del módulo que conoce todas las capas.
@Module({
  controllers: [EmpresasController],
  providers: [
    {
      provide: UNIDAD_DE_TRABAJO_EMPRESAS,
      useFactory: (baseDeDatos: BaseDeDatos): UnidadDeTrabajo<RepositoriosDeEmpresas> =>
        new UnidadDeTrabajoPostgres(baseDeDatos, (ejecutor) => ({ empresas: new RepositorioEmpresasPostgres(ejecutor) })),
      inject: [BaseDeDatos],
    },
    {
      provide: ObtenerEmpresa,
      useFactory: (uow: UnidadDeTrabajo<RepositoriosDeEmpresas>) => new ObtenerEmpresa(uow),
      inject: [UNIDAD_DE_TRABAJO_EMPRESAS],
    },
  ],
  exports: [UNIDAD_DE_TRABAJO_EMPRESAS],
})
export class EmpresasModule {}
