import { Module } from '@nestjs/common';
import { RELOJ, type Reloj, type UnidadDeTrabajo } from '../../compartido/aplicacion/index.js';
import { BaseDeDatos, type Ejecutor } from '../../compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { RelojDelSistema } from '../../compartido/infraestructura/reloj-del-sistema.js';
import { EmpresasModule } from '../empresas/index.js';
import { CrearCliente } from './aplicacion/comandos/crear-cliente.js';
import { CrearProducto } from './aplicacion/comandos/crear-producto.js';
import { BuscarClientes } from './aplicacion/consultas/buscar-clientes.js';
import { BuscarProductos } from './aplicacion/consultas/buscar-productos.js';
import { ObtenerParaVender } from './aplicacion/consultas/obtener-para-vender.js';
import type { RepositoriosDeCatalogo } from './aplicacion/puertos/repositorios-de-catalogo.js';
import { RepositorioClientesPostgres } from './infraestructura/persistencia/repositorio-clientes-postgres.js';
import { RepositorioProductosPostgres } from './infraestructura/persistencia/repositorio-productos-postgres.js';
import { ClientesController } from './presentacion/http/clientes.controller.js';
import { LimiteDeBusquedas } from './presentacion/http/limite-de-busquedas.js';
import { ProductosController } from './presentacion/http/productos.controller.js';

const UNIDAD_DE_TRABAJO_CATALOGO = Symbol('UnidadDeTrabajoCatalogo');

type DeCatalogo = UnidadDeTrabajo<RepositoriosDeCatalogo>;

const repositoriosDeCatalogo = (ejecutor: Ejecutor): RepositoriosDeCatalogo => ({
  clientes: new RepositorioClientesPostgres(ejecutor),
  productos: new RepositorioProductosPostgres(ejecutor),
});

/**
 * Composición del catálogo (EP-05: clientes y productos): único archivo del módulo que conoce todas las capas. EmpresasModule
 * decide en qué empresa corre cada petición (X-Empresa + membresía) y aporta la guarda.
 */
@Module({
  imports: [EmpresasModule],
  controllers: [ClientesController, ProductosController],
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
    { provide: BuscarProductos, useFactory: (uow: DeCatalogo) => new BuscarProductos(uow), inject: [UNIDAD_DE_TRABAJO_CATALOGO] },
    { provide: ObtenerParaVender, useFactory: (uow: DeCatalogo) => new ObtenerParaVender(uow), inject: [UNIDAD_DE_TRABAJO_CATALOGO] },
    {
      provide: CrearProducto,
      useFactory: (uow: DeCatalogo, reloj: Reloj) => new CrearProducto(uow, reloj),
      inject: [UNIDAD_DE_TRABAJO_CATALOGO, RELOJ],
    },
  ],
  // Facturación lee aquí lo que se vende (HU-06.01).
  exports: [ObtenerParaVender],
})
export class CatalogoModule {}
