import { beforeEach, describe, expect, it } from 'vitest';
import {
  RegisterStudentUseCase,
  type RegisterStudentRequest,
} from './register-student-usecase.ts';
import { OrganizationAccess } from '../../../organizations/application/services/organization-access.ts';
import { UserRole } from '../../../accounts/enterprise/enums/user-role.ts';
import { makeUser } from '../../../../../test/factories/make-user.ts';
import { makeOrganization } from '../../../../../test/factories/make-organization.ts';
import { makeMembership } from '../../../../../test/factories/make-membership.ts';
import { makeBranch } from '../../../../../test/factories/make-branch.ts';
import { UsersRepositoryInMemory } from '../../../../../test/repository-in-memory/users-repository-in-memory.ts';
import { OrganizationsRepositoryInMemory } from '../../../../../test/repository-in-memory/organizations-repository-in-memory.ts';
import { MembershipsRepositoryInMemory } from '../../../../../test/repository-in-memory/memberships-repository-in-memory.ts';
import { BranchesRepositoryInMemory } from '../../../../../test/repository-in-memory/branches-repository-in-memory.ts';
import { StudentsRepositoryInMemory } from '../../../../../test/repository-in-memory/students-repository-in-memory.ts';

describe('Register student', () => {
  let users: UsersRepositoryInMemory;
  let organizations: OrganizationsRepositoryInMemory;
  let memberships: MembershipsRepositoryInMemory;
  let branches: BranchesRepositoryInMemory;
  let students: StudentsRepositoryInMemory;
  let sut: RegisterStudentUseCase;
  let input: RegisterStudentRequest;

  beforeEach(async () => {
    users = new UsersRepositoryInMemory();
    organizations = new OrganizationsRepositoryInMemory();
    memberships = new MembershipsRepositoryInMemory(users);
    branches = new BranchesRepositoryInMemory();
    students = new StudentsRepositoryInMemory(users, memberships);
    const org = makeOrganization();
    const admin = makeUser({ password_hash: 'admin-hash' });
    const branch = makeBranch({ organization_id: org.id });
    await organizations.create(org);
    await branches.create(branch);
    await memberships.register(
      admin,
      makeMembership({
        organization_id: org.id,
        user_id: admin.id,
        role: UserRole.ADMIN,
      }),
    );
    sut = new RegisterStudentUseCase(
      new OrganizationAccess(users, organizations, memberships),
      users,
      branches,
      students,
      { today: () => '2026-11-05' },
    );
    input = {
      requestedBy: admin.id.toString(),
      organizationId: org.id.toString(),
      branchId: branch.id.toString(),
      name: 'Pessoa de teste',
      email: 'student@example.com',
      cpf: '529.982.247-25',
      phone: '(49) 99999-0000',
      birthDate: '2000-01-01',
    };
  });

  it('creates a pending account and student without a plan or enrollment', async () => {
    const result = await sut.execute(input);
    expect(result.isRight()).toBe(true);
    if (result.isLeft()) throw result.value;
    expect(result.value.accountCreated).toBe(true);
    expect(result.value.user.isAwaitingPassword).toBe(true);
    expect(result.value.student.cpf.value).toBe('52998224725');
    expect(result.value.student.phone.value).toBe('49999990000');
    expect(
      memberships.items.find((item) =>
        item.user_id.equals(result.value.user.id),
      )?.role,
    ).toBe(UserRole.STUDENT);
    expect(students.items).toHaveLength(1);
  });

  it('reuses account and changes its role to student in the target network', async () => {
    const user = makeUser({ email: input.email, password_hash: 'keep-hash' });
    const org = organizations.items[0];
    await memberships.register(
      user,
      makeMembership({
        organization_id: org.id,
        user_id: user.id,
        role: UserRole.INSTRUCTOR,
      }),
    );
    const result = await sut.execute(input);
    expect(result.isRight()).toBe(true);
    if (result.isLeft()) throw result.value;
    expect(result.value.accountCreated).toBe(false);
    expect(result.value.user.password_hash).toBe('keep-hash');
    expect(
      memberships.items.find((item) => item.user_id.equals(user.id))?.role,
    ).toBe(UserRole.STUDENT);
  });

  it('does not change an existing role when validation fails', async () => {
    const user = makeUser({ email: input.email, password_hash: 'keep-hash' });
    await memberships.register(
      user,
      makeMembership({
        organization_id: organizations.items[0].id,
        user_id: user.id,
        role: UserRole.INSTRUCTOR,
      }),
    );
    const result = await sut.execute({ ...input, cpf: '11111111111' });
    expect(result.isLeft()).toBe(true);
    expect(
      memberships.items.find((item) => item.user_id.equals(user.id))?.role,
    ).toBe(UserRole.INSTRUCTOR);
    expect(students.items).toHaveLength(0);
  });

  it('rejects another email using an already associated CPF', async () => {
    expect((await sut.execute(input)).isRight()).toBe(true);
    const result = await sut.execute({
      ...input,
      email: 'another@example.com',
    });
    expect(result.isLeft()).toBe(true);
    expect(students.items).toHaveLength(1);
    expect(users.items).toHaveLength(2);
  });

  it('requires guardian for a minor and accepts all three guardian fields', async () => {
    const minor = { ...input, birthDate: '2010-01-01' };
    expect((await sut.execute(minor)).isLeft()).toBe(true);
    expect(
      (
        await sut.execute({
          ...minor,
          guardian: {
            name: 'Responsável',
            phone: '(49) 3333-0000',
            relationship: 'Mãe',
          },
        })
      ).isRight(),
    ).toBe(true);
  });

  it('rejects a branch from another network without effects', async () => {
    const other = makeBranch();
    await branches.create(other);
    expect(
      (await sut.execute({ ...input, branchId: other.id.toString() })).isLeft(),
    ).toBe(true);
    expect(students.items).toHaveLength(0);
    expect(users.items).toHaveLength(1);
  });

  it('reuses a student membership without duplicating it and rejects a duplicate profile', async () => {
    const user = makeUser({ email: input.email, password_hash: 'keep-hash' });
    await memberships.register(
      user,
      makeMembership({
        organization_id: organizations.items[0].id,
        user_id: user.id,
        role: UserRole.STUDENT,
      }),
    );
    expect((await sut.execute(input)).isRight()).toBe(true);
    expect((await sut.execute(input)).isLeft()).toBe(true);
    expect(
      memberships.items.filter((item) => item.user_id.equals(user.id)),
    ).toHaveLength(1);
    expect(students.items).toHaveLength(1);
  });

  it('reuses the same identity across independent networks without changing the first role or password', async () => {
    const existing = makeUser({
      email: input.email,
      password_hash: 'existing-hash',
    });
    await users.create(existing);
    const first = await sut.execute(input);
    expect(first.isRight()).toBe(true);

    const secondOrg = makeOrganization();
    const secondAdmin = makeUser({ password_hash: 'admin-hash' });
    const secondBranch = makeBranch({ organization_id: secondOrg.id });
    await organizations.create(secondOrg);
    await branches.create(secondBranch);
    await memberships.register(
      secondAdmin,
      makeMembership({
        organization_id: secondOrg.id,
        user_id: secondAdmin.id,
        role: UserRole.ADMIN,
      }),
    );
    const second = await sut.execute({
      ...input,
      requestedBy: secondAdmin.id.toString(),
      organizationId: secondOrg.id.toString(),
      branchId: secondBranch.id.toString(),
    });

    expect(second.isRight()).toBe(true);
    if (second.isLeft()) throw second.value;
    expect(second.value.user.id.equals(existing.id)).toBe(true);
    expect(second.value.user.password_hash).toBe('existing-hash');
    expect(students.items).toHaveLength(2);
    expect(
      students.items[0].organizationId.equals(students.items[1].organizationId),
    ).toBe(false);
  });

  it('rejects an existing account with a different previously assigned CPF', async () => {
    expect((await sut.execute(input)).isRight()).toBe(true);
    const second = await sut.execute({ ...input, cpf: '11144477735' });
    expect(second.isLeft()).toBe(true);
    expect(students.items).toHaveLength(1);
  });

  it('requires a complete optional address and complete emergency contact when provided', async () => {
    const address = {
      postalCode: '89580-000',
      street: 'Rua Um',
      number: 'S/N',
      neighborhood: 'Centro',
      city: 'Cidade',
      state: 'SC',
    };
    const emergencyContact = {
      name: 'Contato',
      phone: '(49) 3333-0000',
      relationship: 'Irmã',
    };
    expect(
      (
        await sut.execute({ ...input, address: { ...address, city: '' } })
      ).isLeft(),
    ).toBe(true);
    expect(
      (
        await sut.execute({
          ...input,
          emergencyContact: { ...emergencyContact, relationship: '' },
        })
      ).isLeft(),
    ).toBe(true);
    expect(
      (await sut.execute({ ...input, address, emergencyContact })).isRight(),
    ).toBe(true);
  });

  it('uses the calendar birth date for the eighteenth birthday and rejects future dates', async () => {
    expect(
      (await sut.execute({ ...input, birthDate: '2008-11-06' })).isLeft(),
    ).toBe(true);
    expect(
      (await sut.execute({ ...input, birthDate: '2026-11-06' })).isLeft(),
    ).toBe(true);
    expect(
      (await sut.execute({ ...input, birthDate: '2008-11-05' })).isRight(),
    ).toBe(true);
  });

  it('requires an administrator of the selected network', async () => {
    const instructor = makeUser({ password_hash: 'stored' });
    await memberships.register(
      instructor,
      makeMembership({
        organization_id: organizations.items[0].id,
        user_id: instructor.id,
        role: UserRole.INSTRUCTOR,
      }),
    );
    expect(
      (
        await sut.execute({ ...input, requestedBy: instructor.id.toString() })
      ).isLeft(),
    ).toBe(true);
    expect(students.items).toHaveLength(0);
  });

  it('does not allow a platform administrator without an administrative membership', async () => {
    const platform = makeUser({
      is_platform_admin: true,
      password_hash: 'platform-hash',
    });
    await users.create(platform);
    expect(
      (
        await sut.execute({ ...input, requestedBy: platform.id.toString() })
      ).isLeft(),
    ).toBe(true);
    expect(students.items).toHaveLength(0);
  });
});
