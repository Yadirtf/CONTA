import { Module } from '@nestjs/common';
import { SaludModule } from './modulos/salud/index.js';

@Module({
  imports: [SaludModule],
})
export class AppModule {}
