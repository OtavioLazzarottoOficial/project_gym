import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import { UniqueEntityID } from '../../../../core/entities/unique-entity-id.ts';
import {
  User,
  type InvalidUserError,
} from '../../../accounts/enterprise/user.ts';
import { UserRole } from '../../../accounts/enterprise/enums/user-role.ts';
import { NotAllowedError } from '../../../accounts/application/errors/not-allowed-error.ts';
import { UsersRepository } from '../../../accounts/application/repositories/users-repository.ts';
import { OrganizationAccess } from '../../../organizations/application/services/organization-access.ts';
import { BranchesRepository } from '../../../organizations/application/repositories/branches-repository.ts';
import type { OrganizationNotFoundError } from '../../../organizations/application/errors/organization-not-found-error.ts';
import {
  Student,
  type InvalidStudentData,
  type StudentAddressInput,
  type StudentContactInput,
} from '../../enterprise/student.ts';
import { StudentsRepository } from '../repositories/students-repository.ts';
import { StudentRegistrationClock } from '../services/student-registration-clock.ts';
import { InvalidStudentBranchError } from '../errors/invalid-student-branch-error.ts';
import type { StudentAlreadyExistsError } from '../errors/student-already-exists-error.ts';
import type { StudentIdentityConflictError } from '../errors/student-identity-conflict-error.ts';

export interface RegisterStudentRequest {
  requestedBy: string;
  organizationId: string;
  branchId: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  address?: StudentAddressInput | null;
  emergencyContact?: StudentContactInput | null;
  guardian?: StudentContactInput | null;
}
export type RegisterStudentResponse = Either<
  | NotAllowedError
  | OrganizationNotFoundError
  | InvalidStudentBranchError
  | InvalidUserError
  | InvalidStudentData
  | StudentAlreadyExistsError
  | StudentIdentityConflictError,
  { user: User; student: Student; accountCreated: boolean }
>;

@Injectable()
export class RegisterStudentUseCase {
  constructor(
    private readonly access: OrganizationAccess,
    private readonly users: UsersRepository,
    private readonly branches: BranchesRepository,
    private readonly students: StudentsRepository,
    private readonly clock: StudentRegistrationClock,
  ) {}

  async execute(
    input: RegisterStudentRequest,
  ): Promise<RegisterStudentResponse> {
    const access = await this.access.resolve(
      input.requestedBy,
      input.organizationId,
      true,
    );
    if (access.isLeft()) {
      return left(access.value);
    }

    if (access.value.membership?.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const branches = await this.branches.findByOrganizationId(
      input.organizationId,
    );
    if (!branches.some((branch) => branch.id.toString() === input.branchId)) {
      return left(new InvalidStudentBranchError());
    }

    const candidate = User.create({ name: input.name, email: input.email });
    if (candidate.isLeft()) {
      return left(candidate.value);
    }

    const user =
      (await this.users.findByEmail(candidate.value.email.value)) ??
      candidate.value;

    const student = Student.create(
      {
        organizationId: new UniqueEntityID(input.organizationId),
        branchId: new UniqueEntityID(input.branchId),
        userId: user.id,
        cpf: input.cpf,
        phone: input.phone,
        birthDate: input.birthDate,
        address: input.address,
        emergencyContact: input.emergencyContact,
        guardian: input.guardian,
      },
      this.clock.today(),
    );
    if (student.isLeft()) {
      return left(student.value);
    }

    const registered = await this.students.register(
      user,
      student.value,
      input.requestedBy,
    );
    if (registered.isLeft()) {
      return left(registered.value);
    }

    return right(registered.value);
  }
}
