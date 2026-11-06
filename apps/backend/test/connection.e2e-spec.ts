import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/infra/app.module.ts';
import { PrismaService } from '../src/infra/database/prisma/prisma.service.ts';
import { configureApp } from '../src/infra/http/configure-app.ts';

describe('conexão e CORS (e2e)', () => {
  let app: INestApplication;
  const origin = 'http://localhost:5173';

  beforeEach(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ checkConnection: async () => undefined })
      .compile();
    app = module.createNestApplication();

    configureApp(app, { CORS_ORIGINS: origin });

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('retorna o diagnóstico e permite a origem configurada', async () => {
    const response = await request(app.getHttpServer())
      .get('/connection')
      .set('Origin', origin)
      .expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      service: 'backend',
      message: 'Conexão com o backend estabelecida.',
    });

    expect(response.headers['access-control-allow-origin']).toBe(origin);
  });

  it('responde ao preflight', async () => {
    await request(app.getHttpServer())
      .options('/connection')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Content-Type')
      .expect(204)
      .expect('Access-Control-Allow-Origin', origin);
  });

  it('não libera uma origem diferente', async () => {
    const response = await request(app.getHttpServer())
      .get('/connection')
      .set('Origin', 'https://outra-origem.test')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
