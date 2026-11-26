import { Module } from '@nestjs/common';
import { RELOJ, type Reloj, type UnidadDeTrabajo, type UnidadDeTrabajoDelUsuario } from '../../compartido/aplicacion/index.js';
import { BaseDeDatos, type Ejecutor } from '../../compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoDelUsuarioPostgres } from '../../compartido/infraestructura/persistencia/unidad-de-trabajo-del-usuario-postgres.js';
import { UnidadDeTrabajoPostgres } from '../../compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { RelojDelSistema } from '../../compartido/infraestructura/reloj-del-sistema.js';
import { GuardaDeEmpresa, RESOLUTOR_DE_EMPRESA } from '../../compartido/presentacion/empresa/index.js';
import { IdentidadModule } from '../identidad/index.js';
import { CrearEmpresa } from './aplicacion/comandos/crear-empresa.js';
import { ComprobarMembresia } from './aplicacion/consultas/comprobar-membresia.js';
import { ListarMisEmpresas } from './aplicacion/consultas/listar-mis-empresas.js';
import { ObtenerEmpresa } from './aplicacion/consultas/obtener-empresa.js';
import type { RepositoriosDelUsuario } from './aplicacion/puertos/repositorio-de-mis-empresas.js';
import type { RepositoriosDeEmpresas } from './aplicacion/puertos/repositorio-empresas.js';
import { RepositorioDeMisEmpresasPostgres } from './infraestructura/persistencia/repositorio-de-mis-empresas-postgres.js';
import { RepositorioEmpresasPostgres } from './infraestructura/persistencia/repositorio-empresas-postgres.js';
import { RepositorioMembresiasPostgres } from './infraestructura/persistencia/repositorio-membresias-postgres.js';
import { EmpresasController } from './presentacion/http/empresas.controller.js';
import { MisEmpresasController } from './presentacion/http/mis-empresas.controller.js';
import { ResolutorPorMembresia } from './presentacion/http/resolutor-por-membresia.js';

export const UNIDAD_DE_TRABAJO_EMPRESAS = Symbol('UnidadDeTrabajoEmpresas');
const UNIDAD_DE_TRABAJO_DEL_USUARIO = Symbol('UnidadDeTrabajoDelUsuarioEmpresas');

type DeEmpresa = UnidadDeTrabajo<RepositoriosDeEmpresas>;
type DelUsuario = UnidadDeTrabajoDelUsuario<RepositoriosDelUsuario>;

const repositoriosDeEmpresas = (ejecutor: Ejecutor): RepositoriosDeEmpresas => ({
  empresas: new RepositorioEmpresasPostgres(ejecutor),
  membresias: new RepositorioMembresiasPostgres(ejecutor),
});

const repositoriosDelUsuario = (ejecutor: Ejecutor): RepositoriosDelUsuario => ({
  misEmpresas: new RepositorioDeMisEmpresasPostgres(ejecutor),
});

/**
 * Composición: único archivo del módulo que conoce todas las capas. Además de sus endpoints, el módulo decide
 * en qué empresa corre cada petición: exporta RESOLUTOR_DE_EMPRESA y GuardaDeEmpresa para los demás módulos.
 */
@Module({
  imports: [IdentidadModule],
  controllers: [MisEmpresasController, EmpresasController],
  providers: [
    { provide: RELOJ, useClass: RelojDelSistema },
    {
      provide: UNIDAD_DE_TRABAJO_EMPRESAS,
      useFactory: (baseDeDatos: BaseDeDatos): DeEmpresa => new UnidadDeTrabajoPostgres(baseDeDatos, repositoriosDeEmpresas),
      inject: [BaseDeDatos],
    },
    {
      provide: UNIDAD_DE_TRABAJO_DEL_USUARIO,
      useFactory: (baseDeDatos: BaseDeDatos): DelUsuario =>
        new UnidadDeTrabajoDelUsuarioPostgres(baseDeDatos, repositoriosDelUsuario),
      inject: [BaseDeDatos],
    },
    { provide: ObtenerEmpresa, useFactory: (uow: DeEmpresa) => new ObtenerEmpresa(uow), inject: [UNIDAD_DE_TRABAJO_EMPRESAS] },
    {
      provide: ComprobarMembresia,
      useFactory: (uow: DeEmpresa) => new ComprobarMembresia(uow),
      inject: [UNIDAD_DE_TRABAJO_EMPRESAS],
    },
    {
      provide: ListarMisEmpresas,
      useFactory: (uow: DelUsuario) => new ListarMisEmpresas(uow),
      inject: [UNIDAD_DE_TRABAJO_DEL_USUARIO],
    },
    {
      provide: CrearEmpresa,
      useFactory: (empresas: DeEmpresa, delUsuario: DelUsuario, reloj: Reloj) => new CrearEmpresa(empresas, delUsuario, reloj),
      inject: [UNIDAD_DE_TRABAJO_EMPRESAS, UNIDAD_DE_TRABAJO_DEL_USUARIO, RELOJ],
    },
    { provide: RESOLUTOR_DE_EMPRESA, useClass: ResolutorPorMembresia },
    GuardaDeEmpresa,
  ],
  exports: [UNIDAD_DE_TRABAJO_EMPRESAS, RESOLUTOR_DE_EMPRESA, GuardaDeEmpresa],
})
export class EmpresasModule {}
