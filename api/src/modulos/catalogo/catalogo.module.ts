import { Module } from '@nestjs/common';
import { RELOJ, type Reloj, type UnidadDeTrabajo } from '../../compartido/aplicacion/index.js';
import { BaseDeDatos, type Ejecutor } from '../../compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { RelojDelSistema } from '../../compartido/infraestructura/reloj-del-sistema.js';
import { EmpresasModule } from '../empresas/index.js';
import { CrearCliente } from './aplicacion/comandos/crear-cliente.js';
import { BuscarClientes } from './aplicacion/consultas/buscar-clientes.js';
import type { RepositoriosDeCatalogo } from './aplicacion/puertos/repositorio-clientes.js';
import { RepositorioClientesPostgres } from './infraestructura/persistencia/repositorio-clientes-postgres.js';
import { ClientesController } from './presentacion/http/clientes.controller.js';
import { LimiteDeBusquedas } from './presentacion/http/limite-de-busquedas.js';

const UNIDAD_DE_TRABAJO_CATALOGO = Symbol('UnidadDeTrabajoCatalogo');

type DeCatalogo = UnidadDeTrabajo<RepositoriosDeCatalogo>;

const repositoriosDeCatalogo = (ejecutor: Ejecutor): RepositoriosDeCatalogo => ({
  clientes: new RepositorioClientesPostgres(ejecutor),
});

/**
 * Composición del catálogo (EP-05): único archivo del módulo que conoce todas las capas. EmpresasModule
 * decide en qué empresa corre cada petición (X-Empresa + membresía) y aporta la guarda.
 */
@Module({
  imports: [EmpresasModule],
  controllers: [ClientesController],
  providers: [
    LimiteDeBusquedas,
    { provide: RELOJ, useClass: RelojDelSistema },
    {
      provide: UNIDAD_DE_TRABAJO_CATALOGO,
      useFactory: (baseDeDatos: BaseDeDatos): DeCatalogo => new UnidadDeTrabajoPostgres(baseDeDatos, repositoriosDeCatalogo),
      inject: [BaseDeDatos],
    },
    { provide: BuscarClientes, useFactory: (uow: DeCatalogo) => new BuscarClientes(uow), inject: [UNIDAD_DE_TRABAJO_CATALOGO] },
    {
      provide: CrearCliente,
      useFactory: (uow: DeCatalogo, reloj: Reloj) => new CrearCliente(uow, reloj),
      inject: [UNIDAD_DE_TRABAJO_CATALOGO, RELOJ],
    },
  ],
})
export class CatalogoModule {}
