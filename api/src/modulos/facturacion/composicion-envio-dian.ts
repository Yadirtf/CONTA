import type { Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { RELOJ, type Reloj, type UnidadDeTrabajo } from '../../compartido/aplicacion/index.js';
import { BaseDeDatos } from '../../compartido/infraestructura/persistencia/base-de-datos.js';
import { UnidadDeTrabajoPostgres } from '../../compartido/infraestructura/persistencia/unidad-de-trabajo-postgres.js';
import { ProcesarEnvioDian } from './aplicacion/comandos/procesar-envio-dian.js';
import { LOTE_POR_DEFECTO, ProcesarTrabajosVencidos } from './aplicacion/comandos/procesar-trabajos-vencidos.js';
import { SolicitarEnvioDian } from './aplicacion/comandos/solicitar-envio-dian.js';
import {
  DESPERTADOR,
  FUENTE_DE_TRABAJOS_VENCIDOS,
  type Despertador,
  type FuenteDeTrabajosVencidos,
} from './aplicacion/puertos/cola-de-trabajos.js';
import { PROVEEDOR_DE_ACCESO_DIAN, type ProveedorDeAccesoDian } from './aplicacion/puertos/proveedor-de-acceso-dian.js';
import type { RepositoriosDeEnvio } from './aplicacion/puertos/repositorios-de-envio.js';
import { SERVICIO_WEB_DIAN, type ServicioWebDian } from './aplicacion/puertos/servicio-web-dian.js';
import { AccesoDianDesdeEntorno } from './infraestructura/acceso-dian/acceso-dian-desde-entorno.js';
import { DespertadorEnProceso } from './infraestructura/cola/despertador-en-proceso.js';
import { ServicioWebDianDirecto } from './infraestructura/dian-directa/servicio-web/servicio-web-dian-directo.js';
import { ColaDeTrabajosPostgres } from './infraestructura/persistencia/cola-de-trabajos-postgres.js';
import { RegistroDeIntentosPostgres } from './infraestructura/persistencia/registro-de-intentos-postgres.js';
import { RepositorioDeEnviosPostgres } from './infraestructura/persistencia/repositorio-de-envios-postgres.js';
import { TrabajosVencidosPostgres } from './infraestructura/persistencia/trabajos-vencidos-postgres.js';

// Composición del envío a la DIAN (HU-02.03, ADR-0008): une los puertos con sus adaptadores.
// La cola es la tabla conta_sistema.cola_envios_dian; el despertador en proceso la atiende y el endpoint
// interno recupera lo pendiente si la API se reinició. HU-06.04 cambiará solo estos adaptadores.

export const UNIDAD_DE_TRABAJO_DE_ENVIOS = Symbol('UnidadDeTrabajoDeEnvios');

export const PROVEEDORES_DE_ENVIO_DIAN: Provider[] = [
  {
    provide: UNIDAD_DE_TRABAJO_DE_ENVIOS,
    useFactory: (baseDeDatos: BaseDeDatos): UnidadDeTrabajo<RepositoriosDeEnvio> =>
      new UnidadDeTrabajoPostgres(baseDeDatos, (ejecutor) => ({
        envios: new RepositorioDeEnviosPostgres(ejecutor),
        intentos: new RegistroDeIntentosPostgres(ejecutor),
        cola: new ColaDeTrabajosPostgres(ejecutor),
      })),
    inject: [BaseDeDatos],
  },
  { provide: SERVICIO_WEB_DIAN, useFactory: (reloj: Reloj) => new ServicioWebDianDirecto(reloj), inject: [RELOJ] },
  { provide: PROVEEDOR_DE_ACCESO_DIAN, useFactory: () => new AccesoDianDesdeEntorno() },
  {
    provide: FUENTE_DE_TRABAJOS_VENCIDOS,
    useFactory: (baseDeDatos: BaseDeDatos) => new TrabajosVencidosPostgres(baseDeDatos),
    inject: [BaseDeDatos],
  },
  {
    // El despertador necesita al procesador y el procesador al despertador: se resuelve al sonar.
    provide: DESPERTADOR,
    useFactory: (modulo: ModuleRef): Despertador =>
      new DespertadorEnProceso(async () => {
        const { tomados } = await modulo.get(ProcesarTrabajosVencidos).ejecutar();
        return { lleno: tomados >= LOTE_POR_DEFECTO };
      }),
    inject: [ModuleRef],
  },
  {
    provide: SolicitarEnvioDian,
    useFactory: (uow: UnidadDeTrabajo<RepositoriosDeEnvio>, reloj: Reloj, despertador: Despertador) =>
      new SolicitarEnvioDian(uow, reloj, despertador),
    inject: [UNIDAD_DE_TRABAJO_DE_ENVIOS, RELOJ, DESPERTADOR],
  },
  {
    provide: ProcesarEnvioDian,
    useFactory: (
      uow: UnidadDeTrabajo<RepositoriosDeEnvio>,
      servicio: ServicioWebDian,
      acceso: ProveedorDeAccesoDian,
      reloj: Reloj,
      despertador: Despertador,
    ) => new ProcesarEnvioDian(uow, servicio, acceso, reloj, despertador),
    inject: [UNIDAD_DE_TRABAJO_DE_ENVIOS, SERVICIO_WEB_DIAN, PROVEEDOR_DE_ACCESO_DIAN, RELOJ, DESPERTADOR],
  },
  {
    provide: ProcesarTrabajosVencidos,
    useFactory: (fuente: FuenteDeTrabajosVencidos, procesar: ProcesarEnvioDian, reloj: Reloj) =>
      new ProcesarTrabajosVencidos(fuente, procesar, reloj),
    inject: [FUENTE_DE_TRABAJOS_VENCIDOS, ProcesarEnvioDian, RELOJ],
  },
];
