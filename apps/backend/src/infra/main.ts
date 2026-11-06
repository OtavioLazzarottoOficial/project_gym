import { configureApp } from './http/configure-app.ts';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.ts';
import { EnvService } from './env/env.service.ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const envService = app.get(EnvService);
  configureApp(app, { CORS_ORIGINS: envService.get('CORS_ORIGINS') });

  const port = envService.get('PORT');

  await app.listen(port);
}
await bootstrap();
