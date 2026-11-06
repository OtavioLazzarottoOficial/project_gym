import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadEnvFile } from 'node:process';
import pg from 'pg';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/infra/app.module.ts';
import { EnvService } from '../src/infra/env/env.service.ts';
import { PrismaService } from '../src/infra/database/prisma/prisma.service.ts';
import { PrismaStudentMapper } from '../src/infra/database/prisma/mappers/prisma-student-mapper.ts';
import { InvalidPersistedStudentError } from '../src/infra/errors/invalid-persisted-student-error.ts';
import { UsersRepository } from '../src/domain/accounts/application/repositories/users-repository.ts';
import { AuthSessionsRepository } from '../src/domain/auth/application/repositories/auth-sessions-repository.ts';
import { InvitationDelivery } from '../src/domain/accounts/application/messaging/invitation-delivery.ts';
import { StudentsRepository } from '../src/domain/students/application/repositories/students-repository.ts';
import { UserRole } from '../src/domain/accounts/enterprise/enums/user-role.ts';
import { UniqueEntityID } from '../src/core/entities/unique-entity-id.ts';
import { makeUser } from './factories/make-user.ts';
import { makeStudent } from './factories/make-student.ts';
import { issueSession } from './helpers/issue-session.ts';

describe('Student registration (PostgreSQL isolated schema)', () => {
  const schema = `gym_students_test_${randomUUID().replaceAll('-', '')}`;
  let connection: pg.Client;
  let module: TestingModule;
  let app: INestApplication;
  let prisma: PrismaService;
  let schemaCreated = false;
  let sent: Array<{ email: string; token: string }> = [];

  beforeAll(async () => {
    loadEnvFile('.env');
    const url = new URL(process.env.DATABASE_URL!);
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      !['5433', '55439'].includes(url.port) ||
      url.pathname !== '/base_local'
    )
      throw new Error('Integration tests require an isolated local database.');
    connection = new pg.Client({ connectionString: url.toString() });
    await connection.connect();
    await connection.query(`CREATE SCHEMA "${schema}"`);
    schemaCreated = true;
    url.searchParams.set('schema', schema);
    const require = createRequire(import.meta.url);
    execFileSync(
      process.execPath,
      [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        stdio: 'pipe',
        timeout: 25000,
      },
    );
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(InvitationDelivery)
      .useValue({
        send: async (message: { email: string; token: string }) => {
          sent.push(message);
          return !message.email.startsWith('falha@');
        },
      })
      .overrideProvider(EnvService)
      .useValue({
        get: (key: string) =>
          key === 'DATABASE_URL' ? url.toString() : process.env[key],
      })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
    prisma = module.get(PrismaService);
  });

  beforeEach(async () => {
    sent = [];
    await prisma.student.deleteMany();
    await prisma.passwordInvitation.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.membership.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app?.close();
    if (schemaCreated && /^gym_students_test_[a-f0-9]{32}$/.test(schema))
      await connection.query(`DROP SCHEMA "${schema}" CASCADE`);
    await connection?.end();
  });

  async function setup(role: UserRole = UserRole.ADMIN) {
    const user = makeUser({ password_hash: 'stored-hash' });
    await module.get(UsersRepository).create(user);
    const organization = await prisma.organization.create({
      data: { name: 'Rede de teste' },
    });
    const branch = await prisma.branch.create({
      data: {
        organization_id: organization.id,
        name: 'Unidade',
        city: 'Cidade',
      },
    });
    await prisma.membership.create({
      data: {
        user_id: user.id.toString(),
        organization_id: organization.id,
        role,
      },
    });
    const token = await issueSession(
      module.get(JwtService),
      module.get(AuthSessionsRepository),
      user,
    );
    return { user, organization, branch, token };
  }

  const body = (branchId: string) => ({
    branchId,
    name: 'Aluno de teste',
    email: 'aluno@example.test',
    cpf: '529.982.247-25',
    phone: '(49) 99999-0000',
    birthDate: '2000-01-01',
  });
  const path = (orgId: string) => `/organizations/${orgId}/students`;

  it('stores normalized student and CPF, creates account and membership, and sends invitation', async () => {
    const { organization, branch, token } = await setup();
    const response = await request(app.getHttpServer())
      .post(path(organization.id))
      .auth(token, { type: 'bearer' })
      .send(body(branch.id))
      .expect(201);
    expect(response.body.student.cpf).toBe('52998224725');
    expect(response.body.student.phone).toBe('49999990000');
    expect(response.body.student.branch_id).toBe(branch.id);
    expect(response.body.invitation.status).toBe('sent');
    expect(response.body.user).not.toHaveProperty('password_hash');
    expect(JSON.stringify(response.body)).not.toContain(sent[0].token);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'aluno@example.test' },
    });
    expect(user.cpf).toBe('52998224725');
    expect(user.password_hash).toBeNull();
    expect(await prisma.student.count()).toBe(1);
    expect(
      (
        await prisma.membership.findUniqueOrThrow({
          where: {
            organization_id_user_id: {
              organization_id: organization.id,
              user_id: user.id,
            },
          },
        })
      ).role,
    ).toBe('student');
  });

  it('preserves the existing account password and changes only the target network role', async () => {
    const first = await setup();
    const second = await setup();
    const existing = makeUser({
      email: 'aluno@example.test',
      password_hash: 'keep-existing-hash',
    });
    await module.get(UsersRepository).create(existing);
    await prisma.membership.create({
      data: {
        organization_id: first.organization.id,
        user_id: existing.id.toString(),
        role: 'instructor',
      },
    });
    await prisma.membership.create({
      data: {
        organization_id: second.organization.id,
        user_id: existing.id.toString(),
        role: 'admin',
      },
    });
    const result = await request(app.getHttpServer())
      .post(path(first.organization.id))
      .auth(first.token, { type: 'bearer' })
      .send(body(first.branch.id))
      .expect(201);
    expect(result.body.invitation.status).toBe('already_active');
    expect(sent).toHaveLength(0);
    expect(
      (
        await prisma.user.findUniqueOrThrow({
          where: { id: existing.id.toString() },
        })
      ).password_hash,
    ).toBe('keep-existing-hash');
    const memberships = await prisma.membership.findMany({
      where: { user_id: existing.id.toString() },
    });
    expect(
      memberships.find((x) => x.organization_id === first.organization.id)
        ?.role,
    ).toBe('student');
    expect(
      memberships.find((x) => x.organization_id === second.organization.id)
        ?.role,
    ).toBe('admin');
  });

  it('keeps a pending account when email delivery fails and allows resending', async () => {
    const { organization, branch, token } = await setup();
    const response = await request(app.getHttpServer())
      .post(path(organization.id))
      .auth(token, { type: 'bearer' })
      .send({ ...body(branch.id), email: 'falha@example.test' })
      .expect(201);
    expect(response.body.invitation.status).toBe('delivery_failed');
    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: 'falha@example.test' },
    });
    expect(stored.password_hash).toBeNull();
    expect(await prisma.student.count()).toBe(1);
    const retry = await request(app.getHttpServer())
      .post(`/organizations/${organization.id}/invitations`)
      .auth(token, { type: 'bearer' })
      .send({ email: 'falha@example.test' })
      .expect(200);
    expect(retry.body.invitation.status).toBe('delivery_failed');
    expect(
      await prisma.user.count({ where: { email: 'falha@example.test' } }),
    ).toBe(1);
  });

  it('persists optional address and guardian and rejects corrupted persisted contacts', async () => {
    const { organization, branch, token } = await setup();
    const input = {
      ...body(branch.id),
      birthDate: '2010-01-01',
      guardian: {
        name: 'Responsável',
        phone: '(49) 3333-0000',
        relationship: 'Mãe',
      },
      address: {
        postalCode: '89580-000',
        street: 'Rua Um',
        number: 'S/N',
        neighborhood: 'Centro',
        city: 'Cidade',
        state: 'SC',
      },
    };
    const response = await request(app.getHttpServer())
      .post(path(organization.id))
      .auth(token, { type: 'bearer' })
      .send(input)
      .expect(201);
    expect(response.body.student.birth_date).toBe('2010-01-01');
    expect(response.body.student.guardian.phone).toBe('4933330000');
    expect(response.body.student.address.number).toBe('S/N');
    const raw = await prisma.student.findUniqueOrThrow({
      where: { id: response.body.student.id },
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: response.body.student.user_id },
    });
    expect(() =>
      PrismaStudentMapper.toDomain(
        { ...raw, guardian_phone: null },
        user,
        '2026-11-05',
      ),
    ).toThrow(InvalidPersistedStudentError);
  });

  it('allows the same identity across networks without duplicating the CPF', async () => {
    const first = await setup();
    const second = await setup();
    await request(app.getHttpServer())
      .post(path(first.organization.id))
      .auth(first.token, { type: 'bearer' })
      .send(body(first.branch.id))
      .expect(201);
    const result = await request(app.getHttpServer())
      .post(path(second.organization.id))
      .auth(second.token, { type: 'bearer' })
      .send(body(second.branch.id))
      .expect(201);
    expect(result.body.student.organization_id).toBe(second.organization.id);
    expect(await prisma.user.count({ where: { cpf: '52998224725' } })).toBe(1);
    expect(await prisma.student.count()).toBe(2);
  });

  it('rejects a conflicting CPF and duplicated student without changing other records', async () => {
    const { organization, branch, token } = await setup();
    await request(app.getHttpServer())
      .post(path(organization.id))
      .auth(token, { type: 'bearer' })
      .send(body(branch.id))
      .expect(201);
    await request(app.getHttpServer())
      .post(path(organization.id))
      .auth(token, { type: 'bearer' })
      .send(body(branch.id))
      .expect(409);
    await request(app.getHttpServer())
      .post(path(organization.id))
      .auth(token, { type: 'bearer' })
      .send({ ...body(branch.id), email: 'outra@example.test' })
      .expect(409);
    expect(await prisma.student.count()).toBe(1);
    expect(
      await prisma.user.findUnique({ where: { email: 'outra@example.test' } }),
    ).toBeNull();
  });

  it('rejects invalid data, foreign branches and an instructor without side effects', async () => {
    const first = await setup();
    const second = await setup();
    const instructor = await setup(UserRole.INSTRUCTOR);
    await request(app.getHttpServer())
      .post(path(first.organization.id))
      .send(body(first.branch.id))
      .expect(401);
    await request(app.getHttpServer())
      .post(path(instructor.organization.id))
      .auth(instructor.token, { type: 'bearer' })
      .send(body(instructor.branch.id))
      .expect(403);
    await request(app.getHttpServer())
      .post(path(first.organization.id))
      .auth(first.token, { type: 'bearer' })
      .send(body(second.branch.id))
      .expect(404);
    await request(app.getHttpServer())
      .post(path(first.organization.id))
      .auth(first.token, { type: 'bearer' })
      .send({ ...body(first.branch.id), cpf: '11111111111' })
      .expect(400);
    expect(await prisma.student.count()).toBe(0);
  });

  it('lets an administrator register themselves without trying to issue an invitation after the role change', async () => {
    const { organization, branch, token, user } = await setup();
    const response = await request(app.getHttpServer())
      .post(path(organization.id))
      .auth(token, { type: 'bearer' })
      .send({ ...body(branch.id), email: user.email.value })
      .expect(201);
    expect(response.body.invitation.status).toBe('already_active');
    expect(
      (
        await prisma.membership.findUniqueOrThrow({
          where: {
            organization_id_user_id: {
              organization_id: organization.id,
              user_id: user.id.toString(),
            },
          },
        })
      ).role,
    ).toBe('student');
    expect(sent).toHaveLength(0);
  });

  it('rolls back account, CPF and membership when student insertion fails', async () => {
    const { organization, user } = await setup();
    const candidate = makeUser({ email: 'rollback@example.test' });
    const student = makeStudent({
      organizationId: new UniqueEntityID(organization.id),
      branchId: new UniqueEntityID(randomUUID()),
      userId: candidate.id,
      cpf: '52998224725',
    });
    await expect(
      module
        .get(StudentsRepository)
        .register(candidate, student, user.id.toString()),
    ).rejects.toThrow();
    expect(
      await prisma.user.findUnique({ where: { email: candidate.email.value } }),
    ).toBeNull();
    expect(await prisma.student.count()).toBe(0);
    expect(await prisma.membership.count()).toBe(1);
  });

  it('registers the same identity concurrently in two networks without duplicating accounts', async () => {
    const first = await setup();
    const second = await setup();
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(path(first.organization.id))
        .auth(first.token, { type: 'bearer' })
        .send(body(first.branch.id)),
      request(app.getHttpServer())
        .post(path(second.organization.id))
        .auth(second.token, { type: 'bearer' })
        .send(body(second.branch.id)),
    ]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(await prisma.user.count({ where: { cpf: '52998224725' } })).toBe(1);
    expect(await prisma.student.count()).toBe(2);
  });

  it('allows only one simultaneous registration of the same student in one network', async () => {
    const { organization, branch, token } = await setup();
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post(path(organization.id))
          .auth(token, { type: 'bearer' })
          .send(body(branch.id)),
      ),
    );
    expect(
      responses.map((response) => response.status).sort((a, b) => a - b),
    ).toEqual([201, 409]);
    expect(await prisma.student.count()).toBe(1);
  });

  it('resolves concurrent registrations with the same CPF into one identity', async () => {
    const first = await setup();
    const second = await setup();
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(path(first.organization.id))
        .auth(first.token, { type: 'bearer' })
        .send(body(first.branch.id)),
      request(app.getHttpServer())
        .post(path(second.organization.id))
        .auth(second.token, { type: 'bearer' })
        .send({ ...body(second.branch.id), email: 'outro@example.test' }),
    ]);
    expect(
      responses.map((response) => response.status).sort((a, b) => a - b),
    ).toEqual([201, 409]);
    expect(await prisma.user.count({ where: { cpf: '52998224725' } })).toBe(1);
    expect(await prisma.student.count()).toBe(1);
  });
});
