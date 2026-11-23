import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';

async function arrancar(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);
  // Render asigna el puerto en PORT y exige escuchar en 0.0.0.0.
  await app.listen(Number(process.env['PORT'] ?? 3000), '0.0.0.0');
}

await arrancar();
