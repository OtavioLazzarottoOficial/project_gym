import { left, right } from '../../src/core/either.ts';
import {
  StudentsRepository,
  STUDENTS_PAGE_SIZE,
} from '../../src/domain/students/application/repositories/students-repository.ts';
import { StudentAlreadyExistsError } from '../../src/domain/students/application/errors/student-already-exists-error.ts';
import { StudentIdentityConflictError } from '../../src/domain/students/application/errors/student-identity-conflict-error.ts';
import { Student } from '../../src/domain/students/enterprise/student.ts';
import { Membership } from '../../src/domain/organizations/enterprise/membership.ts';
import { UserRole } from '../../src/domain/accounts/enterprise/enums/user-role.ts';
import type { User } from '../../src/domain/accounts/enterprise/user.ts';
import type { UsersRepositoryInMemory } from './users-repository-in-memory.ts';
import type { MembershipsRepositoryInMemory } from './memberships-repository-in-memory.ts';

export class StudentsRepositoryInMemory extends StudentsRepository {
  items: Student[] = [];

  cpfs = new Map<string, string>();

  constructor(
    private readonly users: UsersRepositoryInMemory,
    private readonly memberships: MembershipsRepositoryInMemory,
  ) {
    super();
  }

  async findByOrganizationId(organizationId: string, page: number) {
    const records = this.items
      .filter((student) => student.organizationId.toString() === organizationId)
      .sort((a, b) => a.id.toString().localeCompare(b.id.toString()));
    const start = (page - 1) * STUDENTS_PAGE_SIZE;
    return {
      hasNextPage: records.length > start + STUDENTS_PAGE_SIZE,
      students: records
        .slice(start, start + STUDENTS_PAGE_SIZE)
        .map((student) => {
          const user = this.users.items.find((item) =>
            item.id.equals(student.userId),
          );
          if (!user) throw new Error('Student account missing');
          return { student, name: user.name.value, email: user.email.value };
        }),
    };
  }

  async findById(organizationId: string, studentId: string) {
    const student = this.items.find(
      (item) =>
        item.organizationId.toString() === organizationId &&
        item.id.toString() === studentId,
    );
    if (!student) return null;
    const user = this.users.items.find((item) =>
      item.id.equals(student.userId),
    );
    if (!user) throw new Error('Student account missing');
    return { student, name: user.name.value, email: user.email.value };
  }

  async register(
    candidate: User,
    student: Student,
    _requestedBy: string,
  ): ReturnType<StudentsRepository['register']> {
    const user =
      this.users.items.find((item) => item.email.equals(candidate.email)) ??
      candidate;

    const accountCreated = !this.users.items.includes(user);
    const cpf = student.cpf.value;
    const owner = this.cpfs.get(cpf);
    const otherCpf = [...this.cpfs].find(
      ([storedCpf, userId]) =>
        userId === user.id.toString() && storedCpf !== cpf,
    );
    if ((owner && owner !== user.id.toString()) || otherCpf)
      return left(new StudentIdentityConflictError());
    if (
      this.items.some(
        (item) =>
          item.organizationId.equals(student.organizationId) &&
          item.userId.equals(user.id),
      )
    )
      return left(new StudentAlreadyExistsError());

    const actualStudent = Student.create(
      {
        organizationId: student.organizationId,
        branchId: student.branchId,
        userId: user.id,
        cpf,
        phone: student.phone.value,
        birthDate: student.birthDate,
        address: student.address,
        emergencyContact: student.emergencyContact && {
          ...student.emergencyContact,
          phone: student.emergencyContact.phone.value,
        },
        guardian: student.guardian && {
          ...student.guardian,
          phone: student.guardian.phone.value,
        },
      },
      '2026-11-05',
      student.id,
    );
    if (actualStudent.isLeft()) throw actualStudent.value;
    const existingMembership = this.memberships.items.find(
      (item) =>
        item.organization_id.equals(student.organizationId) &&
        item.user_id.equals(user.id),
    );
    const membership = Membership.create(
      {
        organization_id: student.organizationId,
        user_id: user.id,
        role: UserRole.STUDENT,
        created_at: existingMembership?.created_at,
      },
      existingMembership?.id,
    );
    if (membership.isLeft()) throw membership.value;

    if (accountCreated) this.users.items.push(user);
    this.cpfs.set(cpf, user.id.toString());
    this.memberships.items = this.memberships.items.filter(
      (item) => item !== existingMembership,
    );
    this.memberships.items.push(membership.value);
    this.items.push(actualStudent.value);
    return right({ user, student: actualStudent.value, accountCreated });
  }
}
