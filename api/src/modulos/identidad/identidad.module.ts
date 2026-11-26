import { Module } from '@nestjs/common';
import { RELOJ, type Reloj } from '../../compartido/aplicacion/index.js';
import { BaseDeDatos } from '../../compartido/infraestructura/persistencia/base-de-datos.js';
import { RelojDelSistema } from '../../compartido/infraestructura/reloj-del-sistema.js';
import { CerrarSesion } from './aplicacion/comandos/cerrar-sesion.js';
import { RegistrarPersona } from './aplicacion/comandos/registrar-persona.js';
import { SolicitarCodigo } from './aplicacion/comandos/solicitar-codigo.js';
import { VerificarCodigo } from './aplicacion/comandos/verificar-codigo.js';
import { CelularesDePersonas } from './aplicacion/consultas/celulares-de-personas.js';
import { SesionDelToken } from './aplicacion/consultas/sesion-del-token.js';
import { ENVIADOR_DE_CODIGOS, type EnviadorDeCodigos } from './aplicacion/puertos/enviador-de-codigos.js';
import { UNIDAD_DE_TRABAJO_DE_IDENTIDAD, type UnidadDeTrabajoDeIdentidad } from './aplicacion/puertos/repositorios-de-identidad.js';
import {
  GENERADOR_DE_CODIGOS,
  HUELLAS_DE_ACCESO,
  type GeneradorDeCodigos,
  type HuellasDeAcceso,
} from './aplicacion/puertos/secretos-de-acceso.js';
import { configuracionDeAcceso, type ConfiguracionDeAcceso } from './infraestructura/configuracion/configuracion-de-acceso.js';
import { GeneradorDeCodigosNode } from './infraestructura/cripto/generador-de-codigos-node.js';
import { HuellasNode } from './infraestructura/cripto/huellas-node.js';
import { EnviadorConCelularesDePrueba } from './infraestructura/envio/enviador-con-celulares-de-prueba.js';
import { EnviadorConTope } from './infraestructura/envio/enviador-con-tope.js';
import { EnviadorSinCanal } from './infraestructura/envio/enviador-sin-canal.js';
import { EnviadorWhatsAppCloud } from './infraestructura/envio/enviador-whatsapp-cloud.js';
import { UnidadDeTrabajoDeIdentidadPostgres } from './infraestructura/persistencia/unidad-de-trabajo-identidad-postgres.js';
import { AccesoController } from './presentacion/http/acceso.controller.js';
import { GuardaDeLimitePorOrigen } from './presentacion/http/limite-por-origen.js';
import { GuardaDeSesion } from './presentacion/http/guarda-de-sesion.js';

const CONFIGURACION_DE_ACCESO = Symbol('ConfiguracionDeAcceso');

/** Canal real envuelto: primero se apartan los celulares de prueba, después cuenta el tope por hora. */
function enviadorDe(config: ConfiguracionDeAcceso): EnviadorDeCodigos {
  const canal = config.whatsapp ? new EnviadorWhatsAppCloud(config.whatsapp) : new EnviadorSinCanal();
  return new EnviadorConCelularesDePrueba(config.celularesDePrueba, new EnviadorConTope(canal, config.enviosPorHora));
}

// Composición: único archivo del módulo que conoce todas las capas.
@Module({
  controllers: [AccesoController],
  providers: [
    { provide: RELOJ, useClass: RelojDelSistema },
    { provide: CONFIGURACION_DE_ACCESO, useFactory: () => configuracionDeAcceso() },
    {
      provide: UNIDAD_DE_TRABAJO_DE_IDENTIDAD,
      useFactory: (baseDeDatos: BaseDeDatos) => new UnidadDeTrabajoDeIdentidadPostgres(baseDeDatos),
      inject: [BaseDeDatos],
    },
    {
      provide: HUELLAS_DE_ACCESO,
      useFactory: (config: ConfiguracionDeAcceso) => new HuellasNode(config.secretoDeCodigos),
      inject: [CONFIGURACION_DE_ACCESO],
    },
    {
      provide: GENERADOR_DE_CODIGOS,
      useFactory: (config: ConfiguracionDeAcceso) => new GeneradorDeCodigosNode(config.celularesDePrueba),
      inject: [CONFIGURACION_DE_ACCESO],
    },
    { provide: ENVIADOR_DE_CODIGOS, useFactory: enviadorDe, inject: [CONFIGURACION_DE_ACCESO] },
    {
      provide: SolicitarCodigo,
      useFactory: (uow: UnidadDeTrabajoDeIdentidad, g: GeneradorDeCodigos, h: HuellasDeAcceso, e: EnviadorDeCodigos, r: Reloj) =>
        new SolicitarCodigo(uow, g, h, e, r),
      inject: [UNIDAD_DE_TRABAJO_DE_IDENTIDAD, GENERADOR_DE_CODIGOS, HUELLAS_DE_ACCESO, ENVIADOR_DE_CODIGOS, RELOJ],
    },
    {
      provide: VerificarCodigo,
      useFactory: (uow: UnidadDeTrabajoDeIdentidad, h: HuellasDeAcceso, r: Reloj) => new VerificarCodigo(uow, h, r),
      inject: [UNIDAD_DE_TRABAJO_DE_IDENTIDAD, HUELLAS_DE_ACCESO, RELOJ],
    },
    {
      provide: CerrarSesion,
      useFactory: (uow: UnidadDeTrabajoDeIdentidad, r: Reloj) => new CerrarSesion(uow, r),
      inject: [UNIDAD_DE_TRABAJO_DE_IDENTIDAD, RELOJ],
    },
    {
      provide: SesionDelToken,
      useFactory: (uow: UnidadDeTrabajoDeIdentidad, h: HuellasDeAcceso, r: Reloj) => new SesionDelToken(uow, h, r),
      inject: [UNIDAD_DE_TRABAJO_DE_IDENTIDAD, HUELLAS_DE_ACCESO, RELOJ],
    },
    {
      provide: RegistrarPersona,
      useFactory: (uow: UnidadDeTrabajoDeIdentidad, h: HuellasDeAcceso, r: Reloj) => new RegistrarPersona(uow, h, r),
      inject: [UNIDAD_DE_TRABAJO_DE_IDENTIDAD, HUELLAS_DE_ACCESO, RELOJ],
    },
    {
      provide: CelularesDePersonas,
      useFactory: (uow: UnidadDeTrabajoDeIdentidad) => new CelularesDePersonas(uow),
      inject: [UNIDAD_DE_TRABAJO_DE_IDENTIDAD],
    },
    GuardaDeSesion,
    GuardaDeLimitePorOrigen,
  ],
  // El módulo de empresas arma con SesionDelToken el resolutor de empresa (HU-04.02) y con RegistrarPersona y
  // CelularesDePersonas su directorio de personas para invitar y listar miembros (HU-04.03).
  exports: [GuardaDeSesion, SesionDelToken, RegistrarPersona, CelularesDePersonas, ENVIADOR_DE_CODIGOS],
})
export class IdentidadModule {}
