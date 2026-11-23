import { Global, Module } from '@nestjs/common';
import { GuardaDeEmpresa } from './guarda-de-empresa.js';
import { RESOLUTOR_DE_EMPRESA, ResolutorSinIdentidad } from './resolutor-de-empresa.js';

/** Guarda y resolutor de empresa para todos los módulos. EP-04 cambia ResolutorSinIdentidad por el real. */
@Global()
@Module({
  providers: [{ provide: RESOLUTOR_DE_EMPRESA, useClass: ResolutorSinIdentidad }, GuardaDeEmpresa],
  exports: [RESOLUTOR_DE_EMPRESA, GuardaDeEmpresa],
})
export class ContextoDeEmpresaModule {}
