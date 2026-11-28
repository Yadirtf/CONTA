import type { Provider } from '@nestjs/common';
import { RELOJ, type Reloj, type UnidadDeTrabajo } from '../../compartido/aplicacion/index.js';
import { BaseDeDatos } from '../../compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { AgregarResolucion } from './aplicacion/configuracion/agregar-resolucion.js';
import { GuardarDatosFiscales } from './aplicacion/configuracion/guardar-datos-fiscales.js';
import { GuardarPreferencias } from './aplicacion/configuracion/guardar-preferencias.js';
import { GuardarSoftware } from './aplicacion/configuracion/guardar-software.js';
import { ObtenerConfiguracionDian } from './aplicacion/configuracion/obtener-configuracion-dian.js';
import { CUSTODIA_DE_SECRETOS, type CustodiaDeSecretos } from './aplicacion/puertos/custodia-de-secretos.js';
import { PROVEEDOR_DE_ACCESO_DIAN } from './aplicacion/puertos/proveedor-de-acceso-dian.js';
import { PROVEEDOR_DE_CONFIGURACION_DIAN } from './aplicacion/puertos/proveedor-de-configuracion-dian.js';
import type { RepositoriosDeConfiguracion } from './aplicacion/puertos/repositorios-de-configuracion.js';
import { AccesoDianDesdeEntorno } from './infraestructura/acceso-dian/acceso-dian-desde-entorno.js';
import { AccesoDianGuardado } from './infraestructura/acceso-dian/acceso-dian-guardado.js';
import { ConfiguracionDianDesdeEntorno } from './infraestructura/acceso-dian/configuracion-dian-desde-entorno.js';
import { ConfiguracionDianGuardada } from './infraestructura/acceso-dian/configuracion-dian-guardada.js';
import { custodiaDelEntorno } from './infraestructura/custodia/custodia-aes-gcm.js';
import { BitacoraPostgres } from './infraestructura/persistencia/configuracion/bitacora-postgres.js';
import { DatosFiscalesPostgres } from './infraestructura/persistencia/configuracion/datos-fiscales-postgres.js';
import { PreferenciasPostgres } from './infraestructura/persistencia/configuracion/preferencias-postgres.js';
import { ResolucionesPostgres } from './infraestructura/persistencia/configuracion/resoluciones-postgres.js';
import { SoftwaresPostgres } from './infraestructura/persistencia/configuracion/softwares-postgres.js';
import { LimiteDeCambiosDeConfiguracion } from './presentacion/http/configuracion/limite-de-cambios.js';

// Composición de la configuración DIAN (HU-07.04): la pantalla del dueño escribe en la base y la facturación lee de
// ella. Las variables DIAN_HAB_* quedan solo como respaldo de la empresa que todavía no guardó su software.

export const UNIDAD_DE_TRABAJO_DE_CONFIGURACION = Symbol('UnidadDeTrabajoDeConfiguracion');
type DeConfiguracion = UnidadDeTrabajo<RepositoriosDeConfiguracion>;

export const PROVEEDORES_DE_CONFIGURACION_DIAN: Provider[] = [
  { provide: CUSTODIA_DE_SECRETOS, useFactory: () => custodiaDelEntorno() },
  {
    provide: UNIDAD_DE_TRABAJO_DE_CONFIGURACION,
    useFactory: (baseDeDatos: BaseDeDatos): DeConfiguracion =>
      new UnidadDeTrabajoPostgres(baseDeDatos, (ejecutor) => ({
        datosFiscales: new DatosFiscalesPostgres(ejecutor),
        resoluciones: new ResolucionesPostgres(ejecutor),
        software: new SoftwaresPostgres(ejecutor),
        preferencias: new PreferenciasPostgres(ejecutor),
        bitacora: new BitacoraPostgres(ejecutor),
      })),
    inject: [BaseDeDatos],
  },
  {
    provide: PROVEEDOR_DE_CONFIGURACION_DIAN,
    useFactory: (uow: DeConfiguracion, custodia: CustodiaDeSecretos) =>
      new ConfiguracionDianGuardada(uow, custodia, new ConfiguracionDianDesdeEntorno()),
    inject: [UNIDAD_DE_TRABAJO_DE_CONFIGURACION, CUSTODIA_DE_SECRETOS],
  },
  {
    provide: PROVEEDOR_DE_ACCESO_DIAN,
    useFactory: (uow: DeConfiguracion) => new AccesoDianGuardado(uow, new AccesoDianDesdeEntorno()),
    inject: [UNIDAD_DE_TRABAJO_DE_CONFIGURACION],
  },
  {
    provide: ObtenerConfiguracionDian,
    useFactory: (uow: DeConfiguracion, reloj: Reloj) => new ObtenerConfiguracionDian(uow, reloj),
    inject: [UNIDAD_DE_TRABAJO_DE_CONFIGURACION, RELOJ],
  },
  { provide: GuardarDatosFiscales, useFactory: (uow: DeConfiguracion) => new GuardarDatosFiscales(uow), inject: [UNIDAD_DE_TRABAJO_DE_CONFIGURACION] },
  {
    provide: AgregarResolucion,
    useFactory: (uow: DeConfiguracion, custodia: CustodiaDeSecretos) => new AgregarResolucion(uow, custodia),
    inject: [UNIDAD_DE_TRABAJO_DE_CONFIGURACION, CUSTODIA_DE_SECRETOS],
  },
  {
    provide: GuardarSoftware,
    useFactory: (uow: DeConfiguracion, custodia: CustodiaDeSecretos) => new GuardarSoftware(uow, custodia),
    inject: [UNIDAD_DE_TRABAJO_DE_CONFIGURACION, CUSTODIA_DE_SECRETOS],
  },
  { provide: GuardarPreferencias, useFactory: (uow: DeConfiguracion) => new GuardarPreferencias(uow), inject: [UNIDAD_DE_TRABAJO_DE_CONFIGURACION] },
  LimiteDeCambiosDeConfiguracion,
];
