import type { INestApplication } from '@nestjs/common';

export function configureApp(
  app: INestApplication,
  env: { CORS_ORIGINS: string },
) {
  app.enableCors({
    origin:
      env.CORS_ORIGINS === '*'
        ? true
        : env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
    credentials: true,
  });
}
