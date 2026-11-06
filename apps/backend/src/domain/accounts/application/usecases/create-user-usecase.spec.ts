import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateUserUseCase } from './create-user-usecase.ts';
import { OrganizationAccess } from '../../../organizations/application/services/organization-access.ts';
import { UserRole } from '../../enterprise/enums/user-role.ts';
import { NotAllowedError } from '../errors/not-allowed-error.ts';
import { MembershipAlreadyExistsError } from '../../../organizations/application/errors/membership-already-exists-error.ts';
import { UsersRepositoryInMemory } from '../../../../../test/repository-in-memory/users-repository-in-memory.ts';
import { OrganizationsRepositoryInMemory } from '../../../../../test/repository-in-memory/organizations-repository-in-memory.ts';
import { MembershipsRepositoryInMemory } from '../../../../../test/repository-in-memory/memberships-repository-in-memory.ts';
import { makeOrganization } from '../../../../../test/factories/make-organization.ts';
import { makeMembership } from '../../../../../test/factories/make-membership.ts';
import { makeUser } from '../../../../../test/factories/make-user.ts';

describe('Create user within a network', () => {
  let users: UsersRepositoryInMemory;
  let organizations: OrganizationsRepositoryInMemory;
  let memberships: MembershipsRepositoryInMemory;
  let sut: CreateUserUseCase;
  let organizationId: string;
  let requestedBy: string;
  const input = {
    name: 'Maria Silva',
    email: 'maria@example.com',
    role: UserRole.STUDENT,
  };

  beforeEach(async () => {
    users = new UsersRepositoryInMemory();
    organizations = new OrganizationsRepositoryInMemory();
    memberships = new MembershipsRepositoryInMemory(users);
    const organization = makeOrganization();
    const admin = makeUser({ password_hash: 'stored-hash' });
    await users.create(admin);
    await organizations.create(organization);
    await memberships.register(
      admin,
      makeMembership({
        organization_id: organization.id,
        user_id: admin.id,
        role: UserRole.ADMIN,
      }),
    );
    organizationId = organization.id.toString();
    requestedBy = admin.id.toString();
    sut = new CreateUserUseCase(
      users,
      new OrganizationAccess(users, organizations, memberships),
      memberships,
    );
  });

  it.each(Object.values(UserRole))(
    'creates a pending account with role %s only inside the selected network',
    async (role) => {
      const result = await sut.execute({
        ...input,
        role,
        requestedBy,
        organizationId,
      });
      expect(result.isRight()).toBe(true);
      if (result.isLeft()) {
        throw result.value;
      }
      expect(result.value.membership.role).toBe(role);
      expect(result.value.membership.organization_id.toString()).toBe(
        organizationId,
      );
      expect(result.value.user.is_platform_admin).toBe(false);
      expect(result.value.user.password_hash).toBeNull();
    },
  );

  it('does not grant access to another network even to a network administrator', async () => {
    const other = makeOrganization();
    await organizations.create(other);
    const result = await sut.execute({
      ...input,
      requestedBy,
      organizationId: other.id.toString(),
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(NotAllowedError);
    expect(users.items).toHaveLength(1);
  });

  it.each([UserRole.INSTRUCTOR, UserRole.STUDENT])(
    'does not allow %s to register accounts',
    async (role) => {
      memberships.items[0] = makeMembership({
        organization_id: memberships.items[0].organization_id,
        user_id: memberships.items[0].user_id,
        role,
      });
      const result = await sut.execute({
        ...input,
        requestedBy,
        organizationId,
      });
      expect(result.isLeft()).toBe(true);
      expect(users.items).toHaveLength(1);
    },
  );

  it('reuses an identity from another network without changing name or password', async () => {
    const existing = makeUser({
      name: 'Original',
      email: input.email,
      password_hash: 'existing-hash',
    });
    await users.create(existing);
    const result = await sut.execute({
      ...input,
      email: ' MARIA@EXAMPLE.COM ',
      requestedBy,
      organizationId,
    });
    expect(result.isRight()).toBe(true);
    if (result.isLeft()) {
      throw result.value;
    }
    expect(result.value.user.id.equals(existing.id)).toBe(true);
    expect(existing.name.value).toBe('Original');
    expect(existing.password_hash).toBe('existing-hash');
    expect(users.items).toHaveLength(2);
  });

  it('rejects duplicate membership without changing the existing role', async () => {
    await sut.execute({ ...input, requestedBy, organizationId });
    const result = await sut.execute({
      ...input,
      role: UserRole.ADMIN,
      requestedBy,
      organizationId,
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(MembershipAlreadyExistsError);
    expect(memberships.items[1].role).toBe(UserRole.STUDENT);
  });

  it('allows a platform administrator to provision a network administrator, but not silently operate as one', async () => {
    const platform = makeUser({
      is_platform_admin: true,
      password_hash: 'stored-hash',
    });
    await users.create(platform);
    const denied = await sut.execute({
      ...input,
      requestedBy: platform.id.toString(),
      organizationId,
    });
    const allowed = await sut.execute({
      ...input,
      role: UserRole.ADMIN,
      requestedBy: platform.id.toString(),
      organizationId,
    });
    expect(denied.isLeft()).toBe(true);
    expect(allowed.isRight()).toBe(true);
    expect(
      await memberships.findByUserAndOrganization(
        platform.id.toString(),
        organizationId,
      ),
    ).toBeNull();
  });

  it.each([{ name: '' }, { email: 'invalid' }, { role: 'owner' as UserRole }])(
    'rejects invalid input without effects: %j',
    async (overrides) => {
      const result = await sut.execute({
        ...input,
        ...overrides,
        requestedBy,
        organizationId,
      });
      expect(result.isLeft()).toBe(true);
      expect(users.items).toHaveLength(1);
    },
  );

  it('preserves unexpected persistence failures', async () => {
    const error = new Error('Database unavailable');
    vi.spyOn(memberships, 'register').mockRejectedValueOnce(error);
    await expect(
      sut.execute({ ...input, requestedBy, organizationId }),
    ).rejects.toBe(error);
  });

  it('creates one membership for concurrent requests', async () => {
    const results = await Promise.all([
      sut.execute({ ...input, requestedBy, organizationId }),
      sut.execute({ ...input, requestedBy, organizationId }),
    ]);
    expect(results.filter((result) => result.isRight())).toHaveLength(1);
    expect(users.items).toHaveLength(2);
    expect(memberships.items).toHaveLength(2);
  });
});
