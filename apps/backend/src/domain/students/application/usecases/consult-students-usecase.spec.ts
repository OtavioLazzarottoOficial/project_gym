import { beforeEach, describe, expect, it } from 'vitest';
import { ConsultStudentsUseCase } from './consult-students-usecase.ts';
import { OrganizationAccess } from '../../../organizations/application/services/organization-access.ts';
import { UserRole } from '../../../accounts/enterprise/enums/user-role.ts';
import { StudentNotFoundError } from '../errors/student-not-found-error.ts';
import { NotAllowedError } from '../../../accounts/application/errors/not-allowed-error.ts';
import { makeUser } from '../../../../../test/factories/make-user.ts';
import { makeOrganization } from '../../../../../test/factories/make-organization.ts';
import { makeMembership } from '../../../../../test/factories/make-membership.ts';
import { UsersRepositoryInMemory } from '../../../../../test/repository-in-memory/users-repository-in-memory.ts';
import { OrganizationsRepositoryInMemory } from '../../../../../test/repository-in-memory/organizations-repository-in-memory.ts';
import { MembershipsRepositoryInMemory } from '../../../../../test/repository-in-memory/memberships-repository-in-memory.ts';
import { StudentsRepositoryInMemory } from '../../../../../test/repository-in-memory/students-repository-in-memory.ts';

describe('Consult students', () => {
  let users: UsersRepositoryInMemory;
  let organizations: OrganizationsRepositoryInMemory;
  let memberships: MembershipsRepositoryInMemory;
  let sut: ConsultStudentsUseCase;

  beforeEach(() => {
    users = new UsersRepositoryInMemory();
    organizations = new OrganizationsRepositoryInMemory();
    memberships = new MembershipsRepositoryInMemory(users);
    sut = new ConsultStudentsUseCase(
      new OrganizationAccess(users, organizations, memberships),
      new StudentsRepositoryInMemory(users, memberships),
    );
  });

  it.each([UserRole.ADMIN, UserRole.INSTRUCTOR])(
    'allows %s to consult and returns not found for absent student',
    async (role) => {
      const organization = makeOrganization();
      const user = makeUser({ password_hash: 'hash' });
      await organizations.create(organization);
      await memberships.register(
        user,
        makeMembership({
          organization_id: organization.id,
          user_id: user.id,
          role,
        }),
      );
      const input = {
        requestedBy: user.id.toString(),
        organizationId: organization.id.toString(),
      };
      const list = await sut.execute(input);
      expect(list.isRight()).toBe(true);
      if (list.isRight()) expect(list.value.students).toEqual([]);
      const detail = await sut.execute({ ...input, studentId: 'missing' });
      expect(detail.value).toBeInstanceOf(StudentNotFoundError);
    },
  );

  it('rejects students and platform administrators without a qualifying network membership', async () => {
    const organization = makeOrganization();
    const user = makeUser({ password_hash: 'hash', is_platform_admin: true });
    await organizations.create(organization);
    await memberships.register(
      user,
      makeMembership({
        organization_id: organization.id,
        user_id: user.id,
        role: UserRole.STUDENT,
      }),
    );
    const result = await sut.execute({
      requestedBy: user.id.toString(),
      organizationId: organization.id.toString(),
    });
    expect(result.value).toBeInstanceOf(NotAllowedError);
  });
});
