import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { loadEnvFile } from 'node:process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/infra/app.module.ts';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { EnvService } from '../src/infra/env/env.service.ts';
import { PrismaService } from '../src/infra/database/prisma/prisma.service.ts';
import { UsersRepository } from '../src/domain/accounts/application/repositories/users-repository.ts';
import { InvitationDelivery } from '../src/domain/accounts/application/messaging/invitation-delivery.ts';
import { MembershipsRepository } from '../src/domain/organizations/application/repositories/memberships-repository.ts';
import { AuthSessionsRepository } from '../src/domain/auth/application/repositories/auth-sessions-repository.ts';
import { PasswordChangesRepository } from '../src/domain/accounts/application/repositories/password-changes-repository.ts';
import { HashGenerator } from '../src/domain/auth/application/crypthograpy/hash-generator.ts';
import { makeAuthSession } from './factories/make-auth-session.ts';
import { UserRole } from '../src/domain/accounts/enterprise/enums/user-role.ts';
import { makeUser } from './factories/make-user.ts';
import { makeMembership } from './factories/make-membership.ts';
import { issueSession } from './helpers/issue-session.ts';

describe('Prisma users (real PostgreSQL, isolated schema)', () => {
  const schema = `gym_users_test_${randomUUID().replaceAll('-', '')}`;
  let connection: pg.Client;
  let module: TestingModule;
  let app: INestApplication;
  let prisma: PrismaService;
  let repository: UsersRepository;
  let schemaCreated = false;
  let invitationsSent: Array<{ email: string; token: string }> = [];

  beforeAll(async () => {
    loadEnvFile('.env');
    const databaseUrl = new URL(process.env.DATABASE_URL!);

    if (
      !['localhost', '127.0.0.1'].includes(databaseUrl.hostname) ||
      !['5433', '55439'].includes(databaseUrl.port) ||
      databaseUrl.pathname !== '/base_local'
    ) {
      throw new Error(
        'Integration tests require a local Project Gym test database on port 5433 or 55439.',
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
      imports: [AppModule],
    })
      .overrideProvider(InvitationDelivery)
      .useValue({
        send: async (input: { email: string; token: string }) => {
          invitationsSent.push(input);
          return true;
        },
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
    repository = module.get(UsersRepository);
  });

  beforeEach(async () => {
    invitationsSent = [];
    await prisma.passwordInvitation.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app?.close();

    if (schemaCreated && /^gym_users_test_[a-f0-9]{32}$/.test(schema)) {
      await connection.query(`DROP SCHEMA "${schema}" CASCADE`);
    }

    await connection?.end();
  });

  async function platformAccess() {
    const platform = makeUser({
      is_platform_admin: true,
      password_hash: 'stored-hash',
    });
    await repository.create(platform);
    const token = await issueSession(
      module.get(JwtService),
      module.get(AuthSessionsRepository),
      platform,
    );
    return { user: platform, token };
  }

  async function network(name: string, platformToken: string) {
    const response = await request(app.getHttpServer())
      .post('/organizations')
      .auth(platformToken, { type: 'bearer' })
      .send({ name })
      .expect(201);
    return response.body.organization as { id: string; name: string };
  }

  async function accountIn(organizationId: string, role = UserRole.ADMIN) {
    const user = makeUser({ password_hash: 'stored-hash' });
    const membership = makeMembership({
      user_id: user.id,
      organization_id: new (
        await import('../src/core/entities/unique-entity-id.ts')
      ).UniqueEntityID(organizationId),
      role,
    });
    await module.get(MembershipsRepository).register(user, membership);
    const token = await issueSession(
      module.get(JwtService),
      module.get(AuthSessionsRepository),
      user,
    );
    return { user, token };
  }

  it('allows platform administration to create networks, while a network administrator cannot', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    const admin = await accountIn(a.id);
    await request(app.getHttpServer())
      .post('/organizations')
      .auth(admin.token, { type: 'bearer' })
      .send({ name: 'Unauthorized network' })
      .expect(403);
    expect(await prisma.organization.count()).toBe(1);
  });

  it('keeps units within their network and permits a member to access all its units', async () => {
    const platform = await platformAccess();
    const a = await network('Rede com unidades', platform.token);
    const admin = await accountIn(a.id);
    for (const city of ['Freiburgo', 'Tubarão']) {
      await request(app.getHttpServer())
        .post(`/organizations/${a.id}/branches`)
        .auth(admin.token, { type: 'bearer' })
        .send({ name: `Unidade ${city}`, city })
        .expect(201);
    }
    const student = await accountIn(a.id, UserRole.STUDENT);
    const response = await request(app.getHttpServer())
      .get(`/organizations/${a.id}/branches`)
      .auth(student.token, { type: 'bearer' })
      .expect(200);
    expect(response.body.branches).toHaveLength(2);
    expect(
      response.body.branches.every(
        (branch: { organization_id: string }) =>
          branch.organization_id === a.id,
      ),
    ).toBe(true);
    await request(app.getHttpServer())
      .post(`/organizations/${a.id}/branches`)
      .auth(student.token, { type: 'bearer' })
      .send({ name: 'Denied', city: 'City' })
      .expect(403);
  });

  it('rejects cross-network reads and writes without creating accounts or units', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    const b = await network('Rede B', platform.token);
    const admin = await accountIn(a.id);
    await request(app.getHttpServer())
      .get(`/organizations/${b.id}/branches`)
      .auth(admin.token, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/organizations/${b.id}/branches`)
      .auth(admin.token, { type: 'bearer' })
      .send({ name: 'Denied', city: 'City' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/organizations/${b.id}/users`)
      .auth(admin.token, { type: 'bearer' })
      .send({ name: 'Denied', email: 'denied@example.com', role: 'admin' })
      .expect(403);
    expect(
      await prisma.user.findUnique({ where: { email: 'denied@example.com' } }),
    ).toBeNull();
    expect(await prisma.branch.count()).toBe(0);
  });

  it('reuses one login in independent networks with different roles and no password overwrite', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    const b = await network('Rede B', platform.token);
    await network('Rede invisível', platform.token);
    const adminA = await accountIn(a.id);
    const adminB = await accountIn(b.id);
    const user = makeUser({
      name: 'Original identity',
      email: 'shared@example.com',
      password_hash: 'original-hash',
    });
    await repository.create(user);
    for (const [organizationId, token, role] of [
      [a.id, adminA.token, 'instructor'],
      [b.id, adminB.token, 'student'],
    ]) {
      await request(app.getHttpServer())
        .post(`/organizations/${organizationId}/users`)
        .auth(token, { type: 'bearer' })
        .send({ name: 'Do not overwrite', email: ' SHARED@EXAMPLE.COM ', role })
        .expect(201);
    }
    const token = await issueSession(
      module.get(JwtService),
      module.get(AuthSessionsRepository),
      user,
    );
    const response = await request(app.getHttpServer())
      .get('/organizations')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(response.body.organizations).toHaveLength(2);
    expect(
      response.body.organizations
        .map((org: { role: string }) => org.role)
        .sort(),
    ).toEqual(['instructor', 'student']);
    const stored = await repository.findByEmail(user.email.value);
    expect(stored?.password_hash).toBe('original-hash');
    expect(stored?.name.value).toBe('Original identity');
    expect(
      await prisma.user.count({ where: { email: user.email.value } }),
    ).toBe(1);
  });

  it('does not turn a platform administrator into an implicit member of a network', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    await request(app.getHttpServer())
      .post(`/organizations/${a.id}/users`)
      .auth(platform.token, { type: 'bearer' })
      .send({ name: 'Student', email: 'student@example.com', role: 'student' })
      .expect(403);
    const response = await request(app.getHttpServer())
      .post(`/organizations/${a.id}/users`)
      .auth(platform.token, { type: 'bearer' })
      .send({
        name: 'Network administrator',
        email: 'network.admin@example.com',
        role: 'admin',
      })
      .expect(201);
    expect(response.body.user.is_platform_admin).toBe(false);
    expect(
      await prisma.membership.findFirst({
        where: { user_id: platform.user.id.toString() },
      }),
    ).toBeNull();
  });

  it('enforces the network role even if the token claims platform privileges', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    const member = await accountIn(a.id, UserRole.STUDENT);
    const forgedClaim = await issueSession(
      module.get(JwtService),
      module.get(AuthSessionsRepository),
      member.user,
      { is_platform_admin: true, role: 'admin' },
    );
    await request(app.getHttpServer())
      .post('/organizations')
      .auth(forgedClaim, { type: 'bearer' })
      .send({ name: 'Denied' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/organizations/${a.id}/users`)
      .auth(forgedClaim, { type: 'bearer' })
      .send({ name: 'Denied', email: 'denied@example.com', role: 'admin' })
      .expect(403);
  });

  it('updates authorization from the database without renewing or replacing the JWT', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    const admin = await accountIn(a.id);
    await request(app.getHttpServer())
      .get(`/organizations/${a.id}/branches`)
      .auth(admin.token, { type: 'bearer' })
      .expect(200);
    await prisma.membership.deleteMany({
      where: { user_id: admin.user.id.toString() },
    });
    await request(app.getHttpServer())
      .get(`/organizations/${a.id}/branches`)
      .auth(admin.token, { type: 'bearer' })
      .expect(403);
  });

  it('creates only one account and membership under concurrent duplicate registrations', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    const admin = await accountIn(a.id);
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post(`/organizations/${a.id}/users`)
          .auth(admin.token, { type: 'bearer' })
          .send({
            name: 'Concurrent',
            email: 'concurrent@example.com',
            role: 'student',
          }),
      ),
    );
    expect(
      responses.map((response) => response.status).sort((x, y) => x - y),
    ).toEqual([201, 409]);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'concurrent@example.com' },
    });
    expect(await prisma.membership.count({ where: { user_id: user.id } })).toBe(
      1,
    );
  });

  it('creates one global identity but two memberships concurrently in different networks', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    const b = await network('Rede B', platform.token);
    const responses = await Promise.all(
      [a.id, b.id].map((id) =>
        request(app.getHttpServer())
          .post(`/organizations/${id}/users`)
          .auth(platform.token, { type: 'bearer' })
          .send({
            name: 'Shared admin',
            email: 'parallel@example.com',
            role: 'admin',
          }),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(
      await prisma.user.count({ where: { email: 'parallel@example.com' } }),
    ).toBe(1);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'parallel@example.com' },
    });
    expect(await prisma.membership.count({ where: { user_id: user.id } })).toBe(
      2,
    );
  });

  it('does not overwrite the role of a duplicate membership', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    const admin = await accountIn(a.id);
    const input = {
      name: 'Member',
      email: 'member@example.com',
      role: 'student',
    };
    await request(app.getHttpServer())
      .post(`/organizations/${a.id}/users`)
      .auth(admin.token, { type: 'bearer' })
      .send(input)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/organizations/${a.id}/users`)
      .auth(admin.token, { type: 'bearer' })
      .send({ ...input, role: 'admin' })
      .expect(409);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: input.email },
    });
    expect(
      (
        await prisma.membership.findFirstOrThrow({
          where: { user_id: user.id },
        })
      ).role,
    ).toBe('student');
  });

  it('rejects mass assignment of platform access and invalid organization IDs', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    await request(app.getHttpServer())
      .post(`/organizations/${a.id}/users`)
      .auth(platform.token, { type: 'bearer' })
      .send({
        name: 'Denied',
        email: 'denied@example.com',
        role: 'admin',
        is_platform_admin: true,
      })
      .expect(400);
    await request(app.getHttpServer())
      .get('/organizations/not-a-uuid/branches')
      .auth(platform.token, { type: 'bearer' })
      .expect(400);
    expect(
      await prisma.user.findUnique({ where: { email: 'denied@example.com' } }),
    ).toBeNull();
  });

  it('reissues and consumes a student invitation once under concurrent requests', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    const admin = await accountIn(a.id);
    const created = await request(app.getHttpServer())
      .post(`/organizations/${a.id}/users`)
      .auth(admin.token, { type: 'bearer' })
      .send({
        name: 'Student',
        email: 'student-test@example.com',
        role: 'student',
      })
      .expect(201);
    expect(created.body.invitation).toEqual({ status: 'sent' });
    expect(invitationsSent).toHaveLength(1);
    const first = invitationsSent[0].token;
    const stored = await prisma.passwordInvitation.findFirstOrThrow();
    expect(stored.token_hash).not.toBe(first);
    await request(app.getHttpServer())
      .post(`/organizations/${a.id}/users/${created.body.user.id}/invitation`)
      .auth(admin.token, { type: 'bearer' })
      .expect(200);
    const second = invitationsSent[1].token;
    await request(app.getHttpServer())
      .post('/invitations/accept')
      .send({ token: first, password: 'Password123' })
      .expect(400);
    const attempts = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/invitations/accept')
          .send({ token: second, password: 'Password123' }),
      ),
    );
    expect(
      attempts.map((result) => result.status).sort((a, b) => a - b),
    ).toEqual([204, 400]);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: created.body.user.id },
    });
    expect(user.password_hash).toBeTruthy();
    expect(user.password_hash).not.toBe('Password123');
    await request(app.getHttpServer())
      .post('/sessions')
      .send({ email: user.email, password: 'Password123' })
      .expect(200);
  });

  it('returns a manual administrator link without emailing and rejects other networks', async () => {
    const platform = await platformAccess();
    const a = await network('Rede A', platform.token);
    const b = await network('Rede B', platform.token);
    const admin = await accountIn(a.id);
    const created = await request(app.getHttpServer())
      .post(`/organizations/${a.id}/users`)
      .auth(admin.token, { type: 'bearer' })
      .send({
        name: 'New admin',
        email: 'newadmin-test@example.com',
        role: 'admin',
      })
      .expect(201);
    expect(created.body.invitation.status).toBe('manual');
    expect(created.body.invitation.link).toContain('#token=');
    expect(invitationsSent).toHaveLength(0);
    await request(app.getHttpServer())
      .post(`/organizations/${b.id}/users/${created.body.user.id}/invitation`)
      .auth(admin.token, { type: 'bearer' })
      .expect(403);
  });

  it('changes a password and invalidates two sessions without affecting other accounts', async () => {
    const hash = await module.get(HashGenerator).hash('OldPassword123');
    const user = makeUser({
      email: 'change-test@example.com',
      password_hash: hash,
    });
    const other = makeUser({ password_hash: hash });
    await repository.create(user);
    await repository.create(other);
    const otherToken = await issueSession(
      module.get(JwtService),
      module.get(AuthSessionsRepository),
      other,
    );
    const login = () =>
      request(app.getHttpServer())
        .post('/sessions')
        .send({ email: user.email.value, password: 'OldPassword123' });
    const first = await login().expect(200);
    const second = await login().expect(200);
    const url = '/me/password';
    await request(app.getHttpServer())
      .patch(url)
      .auth(first.body.access_token, { type: 'bearer' })
      .send({ currentPassword: 'wrong', newPassword: 'NewPassword456' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/me')
      .auth(first.body.access_token, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/me')
      .auth(second.body.access_token, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(url)
      .auth(first.body.access_token, { type: 'bearer' })
      .send({ currentPassword: 'OldPassword123', newPassword: 'weak' })
      .expect(400);
    await request(app.getHttpServer())
      .patch(url)
      .auth(first.body.access_token, { type: 'bearer' })
      .send({
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      })
      .expect(204);
    await request(app.getHttpServer())
      .get('/me')
      .auth(first.body.access_token, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/me')
      .auth(second.body.access_token, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .get('/me')
      .auth(otherToken, { type: 'bearer' })
      .expect(200);
    await login().expect(401);
    await request(app.getHttpServer())
      .post('/sessions')
      .send({ email: user.email.value, password: 'NewPassword456' })
      .expect(200);
  });

  it('serializes concurrent login issuance and password change', async () => {
    const user = makeUser({ password_hash: 'original-hash' });
    await repository.create(user);
    const session = makeAuthSession({ user_id: user.id });
    const [loginSaved, changed] = await Promise.all([
      module
        .get(AuthSessionsRepository)
        .createIfPasswordMatches(session, 'original-hash'),
      module
        .get(PasswordChangesRepository)
        .changeAndRevoke({
          userId: user.id.toString(),
          expectedHash: 'original-hash',
          newHash: 'new-hash',
        }),
    ]);
    expect(changed).toBe(true);
    if (loginSaved) {
      const stored = await prisma.authSession.findUniqueOrThrow({
        where: { id: session.id.toString() },
      });
      expect(stored.revoked_at).not.toBeNull();
    } else {
      expect(
        await prisma.authSession.findUnique({
          where: { id: session.id.toString() },
        }),
      ).toBeNull();
    }
    expect(
      await module
        .get(AuthSessionsRepository)
        .createIfPasswordMatches(
          makeAuthSession({ user_id: user.id }),
          'original-hash',
        ),
    ).toBe(false);
  });

  it('preserves historical identities and roles during migration without granting platform access or inventing memberships', async () => {
    const legacySchema = `${schema}_legacy`;
    await connection.query(`CREATE SCHEMA "${legacySchema}"`);
    try {
      await connection.query(`SET search_path TO "${legacySchema}", public`);
      for (const migration of [
        '20261104130000_create_users',
        '20261104140000_create_auth_sessions',
      ]) {
        await connection.query(
          readFileSync(`prisma/migrations/${migration}/migration.sql`, 'utf8'),
        );
      }
      await connection.query(
        'INSERT INTO users (id,name,email,role) VALUES ($1,$2,$3,$4)',
        ['legacy-id', 'Legacy account', 'legacy@example.com', 'admin'],
      );
      await connection.query(
        readFileSync(
          'prisma/migrations/20261104170000_organization_tenancy/migration.sql',
          'utf8',
        ),
      );
      const legacy = await connection.query(
        'SELECT email, role, is_platform_admin FROM users',
      );
      expect(legacy.rows).toEqual([
        {
          email: 'legacy@example.com',
          role: 'admin',
          is_platform_admin: false,
        },
      ]);
      expect(
        (
          await connection.query(
            'SELECT count(*)::int AS count FROM memberships',
          )
        ).rows[0].count,
      ).toBe(0);
    } finally {
      await connection.query('SET search_path TO public');
      if (/^gym_users_test_[a-f0-9]{32}_legacy$/.test(legacySchema)) {
        await connection.query(`DROP SCHEMA "${legacySchema}" CASCADE`);
      }
    }
  });
});
