import { Module } from '@nestjs/common';
import { RELOJ, type Reloj } from '../../compartido/aplicacion/index.js';
import { RelojDelSistema } from '../../compartido/infraestructura/reloj-del-sistema.js';
import { ConsultarSalud } from './aplicacion/consultas/consultar-salud.js';
import { SaludController } from './presentacion/http/salud.controller.js';

export const VERSION_API = process.env['npm_package_version'] ?? process.env['VERSION_API'] ?? '0.1.0';

// Composición: único archivo del módulo que conoce todas las capas.
@Module({
  controllers: [SaludController],
  providers: [
    { provide: RELOJ, useClass: RelojDelSistema },
    {
      provide: ConsultarSalud,
      useFactory: (reloj: Reloj) => new ConsultarSalud(reloj, VERSION_API),
      inject: [RELOJ],
    },
  ],
})
export class SaludModule {}
