import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/infra/app.module.ts';
import { PrismaService } from '../src/infra/database/prisma/prisma.service.ts';
import { UsersRepository } from '../src/domain/accounts/application/repositories/users-repository.ts';
import { InvitationsRepository } from '../src/domain/accounts/application/repositories/invitations-repository.ts';
import { InvitationDelivery } from '../src/domain/accounts/application/messaging/invitation-delivery.ts';
import { InvitationsRepositoryInMemory } from './repository-in-memory/invitations-repository-in-memory.ts';
import { AuthSessionsRepository } from '../src/domain/auth/application/repositories/auth-sessions-repository.ts';
import { OrganizationsRepository } from '../src/domain/organizations/application/repositories/organizations-repository.ts';
import { MembershipsRepository } from '../src/domain/organizations/application/repositories/memberships-repository.ts';
import { BranchesRepository } from '../src/domain/organizations/application/repositories/branches-repository.ts';
import { UserRole } from '../src/domain/accounts/enterprise/enums/user-role.ts';
import { UsersRepositoryInMemory } from './repository-in-memory/users-repository-in-memory.ts';
import { AuthSessionsRepositoryInMemory } from './repository-in-memory/auth-sessions-repository-in-memory.ts';
import { OrganizationsRepositoryInMemory } from './repository-in-memory/organizations-repository-in-memory.ts';
import { MembershipsRepositoryInMemory } from './repository-in-memory/memberships-repository-in-memory.ts';
import { BranchesRepositoryInMemory } from './repository-in-memory/branches-repository-in-memory.ts';
import { makeUser } from './factories/make-user.ts';
import { makeOrganization } from './factories/make-organization.ts';
import { makeMembership } from './factories/make-membership.ts';
import { issueSession } from './helpers/issue-session.ts';

describe('Network-scoped account HTTP', () => {
  let app: INestApplication;
  let users: UsersRepositoryInMemory;
  let organizations: OrganizationsRepositoryInMemory;
  let memberships: MembershipsRepositoryInMemory;
  let sessions: AuthSessionsRepositoryInMemory;
  let jwt: JwtService;
  let organizationId: string;
  let token: string;
  const body = { name: 'Maria', email: 'maria@example.com', role: 'student' };

  beforeEach(async () => {
    users = new UsersRepositoryInMemory();
    organizations = new OrganizationsRepositoryInMemory();
    memberships = new MembershipsRepositoryInMemory(users);
    sessions = new AuthSessionsRepositoryInMemory();
    const organization = makeOrganization();
    const admin = makeUser({ password_hash: 'stored-hash' });
    await users.create(admin);
    await organizations.create(organization);
    await memberships.register(
      admin,
      makeMembership({
        user_id: admin.id,
        organization_id: organization.id,
        role: UserRole.ADMIN,
      }),
    );
    organizationId = organization.id.toString();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(InvitationsRepository)
      .useValue(new InvitationsRepositoryInMemory(users))
      .overrideProvider(InvitationDelivery)
      .useValue({ send: async () => true })
      .overrideProvider(UsersRepository)
      .useValue(users)
      .overrideProvider(AuthSessionsRepository)
      .useValue(sessions)
      .overrideProvider(OrganizationsRepository)
      .useValue(organizations)
      .overrideProvider(MembershipsRepository)
      .useValue(memberships)
      .overrideProvider(BranchesRepository)
      .useValue(new BranchesRepositoryInMemory())
      .overrideProvider(PrismaService)
      .useValue({ checkConnection: async () => undefined })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
    jwt = module.get(JwtService);
    token = await issueSession(jwt, sessions, admin);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await app.close();
  });

  it.each(Object.values(UserRole))(
    'creates membership role %s and never exposes a password',
    async (role) => {
      const response = await request(app.getHttpServer())
        .post(`/organizations/${organizationId}/users`)
        .auth(token, { type: 'bearer' })
        .send({ ...body, role })
        .expect(201);
      expect(response.body.membership.role).toBe(role);
      expect(response.body.invitation.status).toBe(
        role === UserRole.ADMIN ? 'manual' : 'sent',
      );
      if (role !== UserRole.ADMIN)
        expect(response.body.invitation).not.toHaveProperty('link');
      expect(response.body.membership.organization_id).toBe(organizationId);
      expect(response.body.user.is_platform_admin).toBe(false);
      expect(response.body.user).not.toHaveProperty('password_hash');
      expect(response.body.user).not.toHaveProperty('role');
    },
  );

  it('rejects unauthenticated access and the old unscoped endpoint', async () => {
    await request(app.getHttpServer())
      .post(`/organizations/${organizationId}/users`)
      .send(body)
      .expect(401);
    await request(app.getHttpServer())
      .post('/users')
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(404);
  });

  it('does not accept a different network ID even if the JWT claims an admin role', async () => {
    const other = makeOrganization();
    await organizations.create(other);
    await request(app.getHttpServer())
      .post(`/organizations/${other.id.toString()}/users`)
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(403);
    expect(users.items).toHaveLength(1);
  });

  it.each([
    { name: '' },
    { email: 'invalid' },
    { role: 'owner' },
    { password: 'secret' },
    { is_platform_admin: true },
    { requestedBy: 'spoofed' },
    { organization_id: 'spoofed' },
  ])('rejects invalid or privileged body input %j', async (overrides) => {
    await request(app.getHttpServer())
      .post(`/organizations/${organizationId}/users`)
      .auth(token, { type: 'bearer' })
      .send({ ...body, ...overrides })
      .expect(400);
    expect(users.items).toHaveLength(1);
  });

  it('returns 409 for a repeated membership in the same network', async () => {
    await request(app.getHttpServer())
      .post(`/organizations/${organizationId}/users`)
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/organizations/${organizationId}/users`)
      .auth(token, { type: 'bearer' })
      .send({ ...body, email: ' MARIA@EXAMPLE.COM ' })
      .expect(409);
    expect(users.items).toHaveLength(2);
  });

  it('allows an administrator to reissue by email after leaving the registration page', async () => {
    await request(app.getHttpServer())
      .post(`/organizations/${organizationId}/users`)
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(201);
    const response = await request(app.getHttpServer())
      .post(`/organizations/${organizationId}/invitations`)
      .auth(token, { type: 'bearer' })
      .send({ email: ' MARIA@EXAMPLE.COM ' })
      .expect(200);
    expect(response.body.invitation).toEqual({ status: 'sent' });
    await request(app.getHttpServer())
      .post(`/organizations/${organizationId}/invitations`)
      .auth(token, { type: 'bearer' })
      .send({ email: 'missing@example.com' })
      .expect(404);
  });

  it('keeps unexpected failures generic', async () => {
    vi.spyOn(memberships, 'register').mockRejectedValueOnce(
      new Error('private details'),
    );
    const response = await request(app.getHttpServer())
      .post(`/organizations/${organizationId}/users`)
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(500);
    expect(JSON.stringify(response.body)).not.toContain('private details');
  });
});
