import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { BaseDeDatos } from './base-de-datos.js';

/** Una sola BaseDeDatos (un pool) para toda la API. Los módulos la reciben por inyección. */
@Global()
@Module({
  providers: [{ provide: BaseDeDatos, useFactory: () => new BaseDeDatos() }],
  exports: [BaseDeDatos],
})
export class PersistenciaModule implements OnApplicationShutdown {
  constructor(@Inject(BaseDeDatos) private readonly baseDeDatos: BaseDeDatos) {}

  async onApplicationShutdown(): Promise<void> {
    await this.baseDeDatos.cerrar();
  }
}
