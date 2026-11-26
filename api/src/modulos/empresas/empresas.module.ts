import { Module } from '@nestjs/common';
import { RELOJ, type Reloj, type UnidadDeTrabajo, type UnidadDeTrabajoDelUsuario } from '../../compartido/aplicacion/index.js';
import { BaseDeDatos, type Ejecutor } from '../../compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoDelUsuarioPostgres } from '../../compartido/infraestructura/persistencia/unidad-de-trabajo-del-usuario-postgres.js';
import { UnidadDeTrabajoPostgres } from '../../compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { RelojDelSistema } from '../../compartido/infraestructura/reloj-del-sistema.js';
import { GuardaDeEmpresa, RESOLUTOR_DE_EMPRESA } from '../../compartido/presentacion/empresa/index.js';
import { CelularesDePersonas, IdentidadModule, RegistrarPersona } from '../identidad/index.js';
import { CambiarMembresia } from './aplicacion/comandos/cambiar-membresia.js';
import { CrearEmpresa } from './aplicacion/comandos/crear-empresa.js';
import { InvitarMiembro } from './aplicacion/comandos/invitar-miembro.js';
import { ResponderInvitacion } from './aplicacion/comandos/responder-invitacion.js';
import { RetirarMiembro } from './aplicacion/comandos/retirar-miembro.js';
import { ComprobarMembresia } from './aplicacion/consultas/comprobar-membresia.js';
import { ListarMiembros } from './aplicacion/consultas/listar-miembros.js';
import { ListarMisEmpresas } from './aplicacion/consultas/listar-mis-empresas.js';
import { ObtenerEmpresa } from './aplicacion/consultas/obtener-empresa.js';
import { DIRECTORIO_DE_PERSONAS, type DirectorioDePersonas } from './aplicacion/puertos/directorio-de-personas.js';
import type { RepositoriosDelUsuario } from './aplicacion/puertos/repositorio-de-mis-empresas.js';
import type { RepositoriosDeEmpresas } from './aplicacion/puertos/repositorio-empresas.js';
import { DirectorioConIdentidad } from './infraestructura/identidad/directorio-con-identidad.js';
import { RepositorioDeMisEmpresasPostgres } from './infraestructura/persistencia/repositorio-de-mis-empresas-postgres.js';
import { RepositorioEmpresasPostgres } from './infraestructura/persistencia/repositorio-empresas-postgres.js';
import { RepositorioMembresiasPostgres } from './infraestructura/persistencia/repositorio-membresias-postgres.js';
import { EmpresasController } from './presentacion/http/empresas.controller.js';
import { InvitacionesController } from './presentacion/http/invitaciones.controller.js';
import { MiembrosController } from './presentacion/http/miembros.controller.js';
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
  controllers: [MisEmpresasController, EmpresasController, InvitacionesController, MiembrosController],
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
    {
      provide: DIRECTORIO_DE_PERSONAS,
      useFactory: (registrar: RegistrarPersona, celulares: CelularesDePersonas): DirectorioDePersonas =>
        new DirectorioConIdentidad(registrar, celulares),
      inject: [RegistrarPersona, CelularesDePersonas],
    },
    {
      provide: InvitarMiembro,
      useFactory: (uow: DeEmpresa, directorio: DirectorioDePersonas, reloj: Reloj) => new InvitarMiembro(uow, directorio, reloj),
      inject: [UNIDAD_DE_TRABAJO_EMPRESAS, DIRECTORIO_DE_PERSONAS, RELOJ],
    },
    {
      provide: ListarMiembros,
      useFactory: (uow: DeEmpresa, directorio: DirectorioDePersonas) => new ListarMiembros(uow, directorio),
      inject: [UNIDAD_DE_TRABAJO_EMPRESAS, DIRECTORIO_DE_PERSONAS],
    },
    { provide: CambiarMembresia, useFactory: (uow: DeEmpresa) => new CambiarMembresia(uow), inject: [UNIDAD_DE_TRABAJO_EMPRESAS] },
    {
      provide: RetirarMiembro,
      useFactory: (uow: DeEmpresa, reloj: Reloj) => new RetirarMiembro(uow, reloj),
      inject: [UNIDAD_DE_TRABAJO_EMPRESAS, RELOJ],
    },
    {
      provide: ResponderInvitacion,
      useFactory: (uow: DeEmpresa, reloj: Reloj) => new ResponderInvitacion(uow, reloj),
      inject: [UNIDAD_DE_TRABAJO_EMPRESAS, RELOJ],
    },
    { provide: RESOLUTOR_DE_EMPRESA, useClass: ResolutorPorMembresia },
    GuardaDeEmpresa,
  ],
  exports: [UNIDAD_DE_TRABAJO_EMPRESAS, RESOLUTOR_DE_EMPRESA, GuardaDeEmpresa],
})
export class EmpresasModule {}
