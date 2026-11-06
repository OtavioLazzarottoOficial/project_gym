import { HashComparer } from '../src/domain/auth/application/crypthograpy/hash-comparer.ts';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createFirstAdministrator } from '../src/infra/setup/create-first-administrator.ts';
import { FirstAdministratorAlreadyExistsError } from '../src/infra/errors/first-administrator-already-exists-error.ts';
import { issueSession } from './helpers/issue-session.ts';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadEnvFile } from 'node:process';
import pg from 'pg';
import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../src/infra/app.module.ts';
import { DatabaseModule } from '../src/infra/database/database.module.ts';
import { CryptographyModule } from '../src/infra/cryptography/cryptography.module.ts';
import { EnvService } from '../src/infra/env/env.service.ts';
import { PrismaService } from '../src/infra/database/prisma/prisma.service.ts';
import { PrismaAuthSessionsRepository } from '../src/infra/database/prisma/repositories/prisma-auth-sessions-repository.ts';
import { UsersRepository } from '../src/domain/accounts/application/repositories/users-repository.ts';
import { AuthSessionsRepository } from '../src/domain/auth/application/repositories/auth-sessions-repository.ts';
import { AuthenticateUserUseCase } from '../src/domain/auth/application/usecases/authenticate-user-usecase.ts';
import { ValidateSessionUseCase } from '../src/domain/auth/application/usecases/validate-session-usecase.ts';
import { SignOutUseCase } from '../src/domain/auth/application/usecases/sign-out-usecase.ts';
import { HashGenerator } from '../src/domain/auth/application/crypthograpy/hash-generator.ts';
import { InvalidCredentialsError } from '../src/domain/auth/application/errors/invalid-credentials-error.ts';
import { InvalidPersistedAuthSessionError } from '../src/infra/errors/invalid-persisted-auth-session-error.ts';
import { makeUser } from './factories/make-user.ts';
import { makeAuthSession } from './factories/make-auth-session.ts';
import { UniqueEntityID } from '../src/core/entities/unique-entity-id.ts';

describe('Prisma authentication sessions (isolated PostgreSQL)', () => {
  const schema = `gym_auth_test_${randomUUID().replaceAll('-', '')}`;
  const now = new Date('2026-11-04T14:00:00.123Z');
  let connection: pg.Client;
  let module: TestingModule;
  let app: INestApplication;
  let schemaCreated = false;
  let prisma: PrismaService;
  let sessions: AuthSessionsRepository;
  let users: UsersRepository;
  let authenticate: AuthenticateUserUseCase;
  let validate: ValidateSessionUseCase;
  let signOut: SignOutUseCase;

  beforeAll(async () => {
    loadEnvFile('.env');
    const databaseUrl = new URL(process.env.DATABASE_URL!);

    if (
      !['localhost', '127.0.0.1'].includes(databaseUrl.hostname) ||
      databaseUrl.port !== '5433' ||
      databaseUrl.pathname !== '/base_local'
    ) {
      throw new Error(
        'Integration tests require the local Project Gym database on port 5433.',
      );
    }

    connection = new pg.Client({ connectionString: databaseUrl.toString() });
    await connection.connect();
    await connection.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    databaseUrl.searchParams.set('schema', schema);
    const require = createRequire(import.meta.url);
    execFileSync(
      process.execPath,
      [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
      {
        env: { ...process.env, DATABASE_URL: databaseUrl.toString() },
        stdio: 'pipe',
        timeout: 25000,
      },
    );

    module = await Test.createTestingModule({
      imports: [AppModule, DatabaseModule, CryptographyModule],
      providers: [
        AuthenticateUserUseCase,
        ValidateSessionUseCase,
        SignOutUseCase,
      ],
    })
      .overrideProvider(EnvService)
      .useValue({
        get: (key: string) =>
          key === 'DATABASE_URL' ? databaseUrl.toString() : process.env[key],
      })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
    prisma = module.get(PrismaService);
    users = module.get(UsersRepository);
    sessions = module.get(AuthSessionsRepository);
    authenticate = module.get(AuthenticateUserUseCase);
    validate = module.get(ValidateSessionUseCase);
    signOut = module.get(SignOutUseCase);
  });

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    await prisma.authSession.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterAll(async () => {
    await app?.close();

    if (schemaCreated && /^gym_auth_test_[a-f0-9]{32}$/.test(schema)) {
      await connection.query(`DROP SCHEMA "${schema}" CASCADE`);
    }

    await connection?.end();
  });

  async function createAccount() {
    const password = 'Secure123';
    const passwordHash = await module.get(HashGenerator).hash(password);
    const user = makeUser({
      email: 'login@example.com',
      password_hash: passwordHash,
    });
    await users.create(user);

    return { user, password };
  }

  it('authenticates through Nest with real bcrypt, signed JWT and a persisted 8-hour session', async () => {
    expect(sessions).toBeInstanceOf(PrismaAuthSessionsRepository);
    const { user, password } = await createAccount();
    const result = await authenticate.execute({
      email: ' LOGIN@EXAMPLE.COM ',
      password,
    });
    expect(result.isRight()).toBe(true);

    if (result.isLeft()) {
      throw result.value;
    }

    const payload = await module
      .get(JwtService)
      .verifyAsync<{ sub: string; sid: string; iat: number; exp: number }>(
        result.value.access_token,
        { algorithms: ['RS256'] },
      );
    const stored = await sessions.findById(payload.sid);

    expect(payload.sub).toBe(user.id.toString());
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
    expect(stored?.user_id.equals(user.id)).toBe(true);
    expect(stored?.expires_at).toEqual(result.value.expires_at);
    expect(stored?.revoked_at).toBeNull();
    expect(await prisma.authSession.count()).toBe(1);
    expect(
      (
        await validate.execute({ userId: payload.sub, sessionId: payload.sid })
      ).isRight(),
    ).toBe(true);
    expect(payload).not.toHaveProperty('password');
    expect(payload).not.toHaveProperty('password_hash');
  });

  it('round trips dates and revocation without modifying other session data', async () => {
    const { user } = await createAccount();
    const session = makeAuthSession({ user_id: user.id, created_at: now });
    await sessions.create(session);
    const revokedAt = new Date(now.getTime() + 1000);
    await sessions.revokeById(
      session.id.toString(),
      user.id.toString(),
      revokedAt,
    );
    const restored = await sessions.findById(session.id.toString());

    expect(restored?.id.equals(session.id)).toBe(true);
    expect(restored?.created_at).toEqual(now);
    expect(restored?.expires_at).toEqual(session.expires_at);
    expect(restored?.revoked_at).toEqual(revokedAt);
  });

  it('signs out only the selected session and rejects it on subsequent validation', async () => {
    const { user, password } = await createAccount();
    const first = await authenticate.execute({
      email: user.email.value,
      password,
    });
    const second = await authenticate.execute({
      email: user.email.value,
      password,
    });

    if (first.isLeft() || second.isLeft()) {
      throw new Error('Expected authenticated sessions');
    }

    const jwt = module.get(JwtService);
    const a = await jwt.verifyAsync<{ sid: string }>(first.value.access_token);
    const b = await jwt.verifyAsync<{ sid: string }>(second.value.access_token);
    expect(
      (
        await signOut.execute({ userId: user.id.toString(), sessionId: a.sid })
      ).isRight(),
    ).toBe(true);
    expect(
      (
        await validate.execute({ userId: user.id.toString(), sessionId: a.sid })
      ).isLeft(),
    ).toBe(true);
    expect(
      (
        await validate.execute({ userId: user.id.toString(), sessionId: b.sid })
      ).isRight(),
    ).toBe(true);
    expect((await sessions.findById(a.sid))?.revoked_at).not.toBeNull();
    expect((await sessions.findById(b.sid))?.revoked_at).toBeNull();
  });

  it('rejects the exact expiration boundary and does not renew a stored session', async () => {
    const { user } = await createAccount();
    const session = makeAuthSession({ user_id: user.id, created_at: now });
    await sessions.create(session);
    const input = {
      userId: user.id.toString(),
      sessionId: session.id.toString(),
    };
    vi.setSystemTime(new Date(session.expires_at.getTime() - 1));
    expect((await validate.execute(input)).isRight()).toBe(true);
    vi.setSystemTime(session.expires_at);
    expect((await validate.execute(input)).isLeft()).toBe(true);
    const restored = await sessions.findById(session.id.toString());

    expect(restored?.expires_at).toEqual(session.expires_at);
    expect(restored?.revoked_at).toBeNull();
  });

  it('rejects incorrect credentials and pending accounts without storing sessions', async () => {
    const { user } = await createAccount();
    await users.create(
      makeUser({ email: 'pending@example.com', password_hash: null }),
    );

    for (const email of [
      user.email.value,
      'missing@example.com',
      'pending@example.com',
    ]) {
      const result = await authenticate.execute({
        email,
        password: 'Wrong123',
      });
      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(InvalidCredentialsError);
    }

    expect(await prisma.authSession.count()).toBe(0);
  });

  it('returns null for a missing session', async () => {
    expect(await sessions.findById(randomUUID())).toBeNull();
  });

  it('does not revoke another user session or alter data for a missing session', async () => {
    const { user } = await createAccount();
    const session = makeAuthSession({ user_id: user.id, created_at: now });
    await sessions.create(session);
    await sessions.revokeById(session.id.toString(), randomUUID(), now);
    await sessions.revokeById(randomUUID(), user.id.toString(), now);

    expect(
      (await sessions.findById(session.id.toString()))?.revoked_at,
    ).toBeNull();
    expect(await prisma.authSession.count()).toBe(1);
  });

  it('preserves the first revocation, including concurrent updates', async () => {
    const { user } = await createAccount();
    const session = makeAuthSession({ user_id: user.id, created_at: now });
    await sessions.create(session);
    const earlier = new Date(now.getTime() + 1000);
    const later = new Date(now.getTime() + 2000);
    await Promise.all([
      sessions.revokeById(session.id.toString(), user.id.toString(), earlier),
      sessions.revokeById(session.id.toString(), user.id.toString(), later),
    ]);
    const winner = (await sessions.findById(session.id.toString()))?.revoked_at;
    expect([earlier.getTime(), later.getTime()]).toContain(winner?.getTime());
    await sessions.revokeById(
      session.id.toString(),
      user.id.toString(),
      new Date(now.getTime() + 3000),
    );
    expect(
      (await sessions.findById(session.id.toString()))?.revoked_at,
    ).toEqual(winner);
  });

  it('enforces the user foreign key and propagates the actual persistence error', async () => {
    const orphan = makeAuthSession({
      user_id: new UniqueEntityID(randomUUID()),
      created_at: now,
    });

    await expect(sessions.create(orphan)).rejects.toMatchObject({
      code: 'P2003',
    });
    expect(await prisma.authSession.count()).toBe(0);
  });

  it('does not convert duplicate session identity to an email conflict or success', async () => {
    const { user } = await createAccount();
    const session = makeAuthSession({ user_id: user.id, created_at: now });
    await sessions.create(session);

    await expect(sessions.create(session)).rejects.toMatchObject({
      code: 'P2002',
    });
    expect(await prisma.authSession.count()).toBe(1);
  });

  it('rejects corrupted stored session data explicitly', async () => {
    const { user } = await createAccount();
    const invalid = await prisma.authSession.create({
      data: {
        user_id: user.id.toString(),
        created_at: now,
        expires_at: new Date(now.getTime() + 1000),
      },
    });

    await expect(sessions.findById(invalid.id)).rejects.toBeInstanceOf(
      InvalidPersistedAuthSessionError,
    );
  });

  it('logs in publicly by HTTP, returns public account fields and permits GET /me', async () => {
    const { user, password } = await createAccount();
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .send({ email: ' LOGIN@EXAMPLE.COM ', password })
      .expect(200);

    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.user.id).toBe(user.id.toString());
    expect(response.body.user).not.toHaveProperty('password_hash');
    expect(response.body.user).not.toHaveProperty('props');
    expect(response.body.expires_at).toBe(
      new Date(
        Math.floor(now.getTime() / 1000) * 1000 + 8 * 60 * 60 * 1000,
      ).toISOString(),
    );
    const profile = await request(app.getHttpServer())
      .get('/me')
      .auth(response.body.access_token, { type: 'bearer' })
      .expect(200);
    expect(profile.body.user.id).toBe(user.id.toString());
    expect(profile.body.user).not.toHaveProperty('password_hash');
  });

  it.each(['wrong-password', 'missing', 'pending'])(
    'returns the same HTTP error for %s without creating sessions',
    async (scenario) => {
      const { user } = await createAccount();
      await users.create(
        makeUser({ email: 'pending@example.com', password_hash: null }),
      );
      const email =
        scenario === 'wrong-password'
          ? user.email.value
          : scenario === 'pending'
            ? 'pending@example.com'
            : 'missing@example.com';
      const response = await request(app.getHttpServer())
        .post('/sessions')
        .send({ email, password: 'Wrong123' })
        .expect(401);

      expect(response.body.message).toBe('Email ou senha incorretos.');
      expect(await prisma.authSession.count()).toBe(0);
    },
  );

  it.each([
    { email: 'invalid', password: 'Secure123' },
    { email: 'login@example.com', password: '' },
    { email: 'login@example.com', password: 'a'.repeat(73) },
    { email: 'login@example.com', password: 'Secure123', role: 'admin' },
  ])('validates login body %j', async (body) => {
    await request(app.getHttpServer()).post('/sessions').send(body).expect(400);
    expect(await prisma.authSession.count()).toBe(0);
  });

  it('requires a valid stored session, not only a signed JWT', async () => {
    const { user } = await createAccount();
    const jwt = module.get(JwtService);
    const noSession = await jwt.signAsync(
      { sub: user.id.toString() },
      { expiresIn: '8h' },
    );
    const unknownSession = await jwt.signAsync(
      { sub: user.id.toString(), sid: randomUUID() },
      { expiresIn: '8h' },
    );

    await request(app.getHttpServer())
      .get('/me')
      .auth(noSession, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/me')
      .auth(unknownSession, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer()).get('/me').expect(401);
  });

  it('rejects signed tokens with mismatched owner or expiration claims', async () => {
    const { user } = await createAccount();
    const jwt = module.get(JwtService);
    const token = await issueSession(jwt, sessions, user);
    const payload = await jwt.verifyAsync<Record<string, unknown>>(token);
    const otherOwner = await jwt.signAsync({ ...payload, sub: randomUUID() });
    const extended = await jwt.signAsync({
      ...payload,
      exp: Number(payload.exp) + 3600,
    });

    await request(app.getHttpServer())
      .get('/me')
      .auth(otherOwner, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/me')
      .auth(extended, { type: 'bearer' })
      .expect(401);
  });

  it('revokes the session by HTTP; the old token is rejected while another login remains valid', async () => {
    const { user, password } = await createAccount();
    const a = await request(app.getHttpServer())
      .post('/sessions')
      .send({ email: user.email.value, password })
      .expect(200);
    const b = await request(app.getHttpServer())
      .post('/sessions')
      .send({ email: user.email.value, password })
      .expect(200);

    await request(app.getHttpServer())
      .delete('/sessions/current')
      .auth(a.body.access_token, { type: 'bearer' })
      .expect(204);
    await request(app.getHttpServer())
      .get('/me')
      .auth(a.body.access_token, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/me')
      .auth(b.body.access_token, { type: 'bearer' })
      .expect(200);
  });

  it('rejects protected HTTP at the exact 8-hour boundary without renewing', async () => {
    const { user, password } = await createAccount();
    const response = await request(app.getHttpServer())
      .post('/sessions')
      .send({ email: user.email.value, password })
      .expect(200);
    vi.setSystemTime(new Date(response.body.expires_at));

    await request(app.getHttpServer())
      .get('/me')
      .auth(response.body.access_token, { type: 'bearer' })
      .expect(401);
    expect(await prisma.authSession.count()).toBe(1);
  });

  it('keeps unexpected session lookup failures as generic HTTP 500', async () => {
    const { user } = await createAccount();
    const token = await issueSession(module.get(JwtService), sessions, user);
    vi.spyOn(prisma.authSession, 'findUnique').mockRejectedValueOnce(
      new Error('private connection details'),
    );
    const response = await request(app.getHttpServer())
      .get('/me')
      .auth(token, { type: 'bearer' })
      .expect(500);

    expect(JSON.stringify(response.body)).not.toContain(
      'private connection details',
    );
  });

  it('creates the first administrator locally with a hash and permits real login', async () => {
    const input = {
      name: 'First Admin',
      email: ' ADMIN@EXAMPLE.COM ',
      password: 'Secure123',
    };
    const result = await createFirstAdministrator(
      prisma,
      module.get(HashGenerator),
      input,
      module.get(HashComparer),
    );
    expect(result.isRight()).toBe(true);
    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'admin@example.com' },
    });
    expect(stored.is_platform_admin).toBe(true);
    expect(stored.password_hash).not.toBe(input.password);

    await request(app.getHttpServer())
      .post('/sessions')
      .send({ email: 'admin@example.com', password: input.password })
      .expect(200);
    const repeat = await createFirstAdministrator(
      prisma,
      module.get(HashGenerator),
      { ...input, name: 'Changed', password: 'Another123' },
      module.get(HashComparer),
    );
    expect(repeat.isLeft()).toBe(true);
    expect(repeat.value).toBeInstanceOf(FirstAdministratorAlreadyExistsError);
    expect(
      await prisma.user.findUniqueOrThrow({ where: { id: stored.id } }),
    ).toEqual(stored);
  });

  it('serializes concurrent first-administrator commands and creates only one', async () => {
    const results = await Promise.all([
      createFirstAdministrator(
        prisma,
        module.get(HashGenerator),
        {
          name: 'Admin One',
          email: 'one@example.com',
          password: 'Secure123',
        },
        module.get(HashComparer),
      ),
      createFirstAdministrator(
        prisma,
        module.get(HashGenerator),
        {
          name: 'Admin Two',
          email: 'two@example.com',
          password: 'Secure123',
        },
        module.get(HashComparer),
      ),
    ]);

    expect(results.filter((result) => result.isRight())).toHaveLength(1);
    expect(results.filter((result) => result.isLeft())).toHaveLength(1);
    expect(
      await prisma.user.count({ where: { is_platform_admin: true } }),
    ).toBe(1);
  });

  it('rejects invalid first-administrator data without creating an account', async () => {
    const result = await createFirstAdministrator(
      prisma,
      module.get(HashGenerator),
      { name: 'Admin', email: 'admin@example.com', password: 'weak' },
      module.get(HashComparer),
    );

    expect(result.isLeft()).toBe(true);
    expect(await prisma.user.count()).toBe(0);
  });

  it('promotes an existing identity only with its current password and preserves identity data', async () => {
    const { user, password } = await createAccount();
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: user.id.toString() },
    });
    const invalid = await createFirstAdministrator(
      prisma,
      module.get(HashGenerator),
      {
        name: 'Do not overwrite',
        email: user.email.value,
        password: 'Wrong123',
      },
      module.get(HashComparer),
    );
    expect(invalid.isLeft()).toBe(true);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: before.id } }))
        .is_platform_admin,
    ).toBe(false);
    const promoted = await createFirstAdministrator(
      prisma,
      module.get(HashGenerator),
      { name: 'Do not overwrite', email: user.email.value, password },
      module.get(HashComparer),
    );
    expect(promoted.isRight()).toBe(true);
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: before.id },
    });
    expect(after).toEqual({ ...before, is_platform_admin: true });
  });

  it('propagates read failures instead of returning null', async () => {
    const failure = new Error('Connection unavailable');
    vi.spyOn(prisma.authSession, 'findUnique').mockRejectedValueOnce(failure);

    await expect(sessions.findById(randomUUID())).rejects.toBe(failure);
  });

  it('propagates revocation failures without reporting success', async () => {
    const failure = new Error('Connection unavailable');
    vi.spyOn(prisma.authSession, 'updateMany').mockRejectedValueOnce(failure);

    await expect(
      sessions.revokeById(randomUUID(), randomUUID(), now),
    ).rejects.toBe(failure);
  });
});
