import { AuthSessionsRepository } from '../src/domain/auth/application/repositories/auth-sessions-repository.ts';
import { AuthSessionsRepositoryInMemory } from './repository-in-memory/auth-sessions-repository-in-memory.ts';
import { issueSession } from './helpers/issue-session.ts';
import { UsersRepository } from '../src/domain/accounts/application/repositories/users-repository.ts';
import { UsersRepositoryInMemory } from './repository-in-memory/users-repository-in-memory.ts';
import { makeUser } from './factories/make-user.ts';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/infra/app.module.ts';
import { PrismaService } from '../src/infra/database/prisma/prisma.service.ts';
import { Public } from '../src/infra/auth/public.ts';

@Controller('_test')
class PublicTestController {
  @Public()
  @Get('public')
  handle() {
    return { public: true };
  }
}

describe('base HTTP com JWT RS256', () => {
  let app: INestApplication;
  let token: string;
  let jwt: JwtService;
  let sessions: AuthSessionsRepositoryInMemory;
  const checkConnection = vi.fn<() => Promise<void>>();

  beforeEach(async () => {
    checkConnection.mockReset().mockResolvedValue();
    const users = new UsersRepositoryInMemory();
    sessions = new AuthSessionsRepositoryInMemory();
    const user = makeUser({ password_hash: 'stored-test-hash' });
    await users.create(user);
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [PublicTestController],
    })
      .overrideProvider(UsersRepository)
      .useValue(users)
      .overrideProvider(AuthSessionsRepository)
      .useValue(sessions)
      .overrideProvider(PrismaService)
      .useValue({ checkConnection })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
    jwt = module.get(JwtService);
    token = await issueSession(jwt, sessions, user);
  });
  afterEach(async () => {
    await app.close();
  });

  it('recusa acesso sem token', async () => {
    await request(app.getHttpServer()).get('/').expect(401);
    await request(app.getHttpServer()).get('/me').expect(401);
  });
  it('aceita token RS256 válido', async () => {
    await request(app.getHttpServer())
      .get('/')
      .auth(token, { type: 'bearer' })
      .expect(200)
      .expect('Hello World!');
  });
  it('permite rota marcada Public', async () => {
    await request(app.getHttpServer())
      .get('/_test/public')
      .expect(200)
      .expect({ public: true });
  });
  it('rejeita token assinado com payload inválido', async () => {
    const invalid = await jwt.signAsync({ sub: 'invalid' });
    await request(app.getHttpServer())
      .get('/')
      .auth(invalid, { type: 'bearer' })
      .expect(401);
  });
  it('consulta o próprio perfil autenticado', async () => {
    const response = await request(app.getHttpServer())
      .get('/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(response.body.user.id).toEqual(expect.any(String));
    expect(response.body.user).not.toHaveProperty('password_hash');
  });
  it('retorna 500 sem expor falhas privadas da sessão', async () => {
    vi.spyOn(sessions, 'findById').mockRejectedValueOnce(
      new Error('detalhes privados'),
    );
    const response = await request(app.getHttpServer())
      .get('/me')
      .auth(token, { type: 'bearer' })
      .expect(500);
    expect(JSON.stringify(response.body)).not.toContain('detalhes privados');
  });
});
