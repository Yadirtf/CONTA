import type { Provider } from '@nestjs/common';
import { RELOJ, type Reloj, type UnidadDeTrabajo } from '../../compartido/aplicacion/index.js';
import { BaseDeDatos } from '../../compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { ObtenerParaVender } from '../catalogo/index.js';
import { CompletarEmisionesPendientes } from './aplicacion/comandos/completar-emisiones-pendientes.js';
import { EmitirVenta } from './aplicacion/comandos/emitir-venta.js';
import { FirmarDocumentoElectronico } from './aplicacion/comandos/firmar-documento-electronico.js';
import { GenerarXmlFactura } from './aplicacion/comandos/generar-xml-factura.js';
import { RegistrarVenta } from './aplicacion/comandos/registrar-venta.js';
import { SolicitarEnvioDian } from './aplicacion/comandos/solicitar-envio-dian.js';
import { ConsultarVenta } from './aplicacion/consultas/consultar-venta.js';
import { CATALOGO_DE_VENTA, type CatalogoDeVenta } from './aplicacion/puertos/catalogo-de-venta.js';
import { FUENTE_DE_EMISIONES_PENDIENTES, type FuenteDeEmisionesPendientes } from './aplicacion/puertos/cola-de-emisiones.js';
import { DESPERTADOR, type Despertador } from './aplicacion/puertos/cola-de-trabajos.js';
import { PROVEEDOR_DE_ACCESO_DIAN, type ProveedorDeAccesoDian } from './aplicacion/puertos/proveedor-de-acceso-dian.js';
import {
  PROVEEDOR_DE_CONFIGURACION_DIAN,
  type ProveedorDeConfiguracionDian,
} from './aplicacion/puertos/proveedor-de-configuracion-dian.js';
import type { RepositoriosDeVenta } from './aplicacion/puertos/repositorios-de-venta.js';
import { ConfiguracionDianDesdeEntorno } from './infraestructura/acceso-dian/configuracion-dian-desde-entorno.js';
import { CatalogoDeVentaConCatalogo } from './infraestructura/catalogo/catalogo-de-venta-con-catalogo.js';
import { ColaDeEmisionesPostgres } from './infraestructura/persistencia/ventas/cola-de-emisiones-postgres.js';
import { EmisionesPendientesPostgres } from './infraestructura/persistencia/ventas/emisiones-pendientes-postgres.js';
import { NumeracionPostgres } from './infraestructura/persistencia/ventas/numeracion-postgres.js';
import { RepositorioDeVentasPostgres } from './infraestructura/persistencia/ventas/repositorio-de-ventas-postgres.js';

// Composición de las ventas (HU-06.01): une los puertos con sus adaptadores. El catálogo entra por su API pública;
// la configuración DIAN sale del entorno hasta EP-07.

const UNIDAD_DE_TRABAJO_DE_VENTAS = Symbol('UnidadDeTrabajoDeVentas');
type DeVentas = UnidadDeTrabajo<RepositoriosDeVenta>;

export const PROVEEDORES_DE_VENTAS: Provider[] = [
  {
    provide: UNIDAD_DE_TRABAJO_DE_VENTAS,
    useFactory: (baseDeDatos: BaseDeDatos): DeVentas =>
      new UnidadDeTrabajoPostgres(baseDeDatos, (ejecutor) => ({
        ventas: new RepositorioDeVentasPostgres(ejecutor),
        numeracion: new NumeracionPostgres(ejecutor),
        emisiones: new ColaDeEmisionesPostgres(ejecutor),
      })),
    inject: [BaseDeDatos],
  },
  { provide: PROVEEDOR_DE_CONFIGURACION_DIAN, useFactory: () => new ConfiguracionDianDesdeEntorno() },
  {
    provide: CATALOGO_DE_VENTA,
    useFactory: (obtener: ObtenerParaVender) => new CatalogoDeVentaConCatalogo(obtener),
    inject: [ObtenerParaVender],
  },
  {
    provide: FUENTE_DE_EMISIONES_PENDIENTES,
    useFactory: (baseDeDatos: BaseDeDatos) => new EmisionesPendientesPostgres(baseDeDatos),
    inject: [BaseDeDatos],
  },
  {
    provide: EmitirVenta,
    useFactory: (
      uow: DeVentas,
      configuracion: ProveedorDeConfiguracionDian,
      acceso: ProveedorDeAccesoDian,
      generar: GenerarXmlFactura,
      firmar: FirmarDocumentoElectronico,
      solicitar: SolicitarEnvioDian,
      reloj: Reloj,
    ) => new EmitirVenta(uow, configuracion, acceso, generar, firmar, solicitar, reloj),
    inject: [
      UNIDAD_DE_TRABAJO_DE_VENTAS,
      PROVEEDOR_DE_CONFIGURACION_DIAN,
      PROVEEDOR_DE_ACCESO_DIAN,
      GenerarXmlFactura,
      FirmarDocumentoElectronico,
      SolicitarEnvioDian,
      RELOJ,
    ],
  },
  {
    provide: RegistrarVenta,
    useFactory: (
      uow: DeVentas,
      catalogo: CatalogoDeVenta,
      configuracion: ProveedorDeConfiguracionDian,
      emitir: EmitirVenta,
      reloj: Reloj,
      despertador: Despertador,
    ) => new RegistrarVenta(uow, catalogo, configuracion, emitir, reloj, despertador),
    inject: [UNIDAD_DE_TRABAJO_DE_VENTAS, CATALOGO_DE_VENTA, PROVEEDOR_DE_CONFIGURACION_DIAN, EmitirVenta, RELOJ, DESPERTADOR],
  },
  {
    provide: CompletarEmisionesPendientes,
    useFactory: (fuente: FuenteDeEmisionesPendientes, emitir: EmitirVenta, reloj: Reloj) =>
      new CompletarEmisionesPendientes(fuente, emitir, reloj),
    inject: [FUENTE_DE_EMISIONES_PENDIENTES, EmitirVenta, RELOJ],
  },
  { provide: ConsultarVenta, useFactory: (uow: DeVentas) => new ConsultarVenta(uow), inject: [UNIDAD_DE_TRABAJO_DE_VENTAS] },
];
