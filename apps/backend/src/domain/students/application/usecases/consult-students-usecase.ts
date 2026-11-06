import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import { NotAllowedError } from '../../../accounts/application/errors/not-allowed-error.ts';
import { UserRole } from '../../../accounts/enterprise/enums/user-role.ts';
import { OrganizationAccess } from '../../../organizations/application/services/organization-access.ts';
import type { OrganizationNotFoundError } from '../../../organizations/application/errors/organization-not-found-error.ts';
import {
  StudentsRepository,
  type StudentRecord,
} from '../repositories/students-repository.ts';
import { StudentNotFoundError } from '../errors/student-not-found-error.ts';

@Injectable()
export class ConsultStudentsUseCase {
  constructor(
    private readonly access: OrganizationAccess,
    private readonly students: StudentsRepository,
  ) {}

  async execute(input: {
    requestedBy: string;
    organizationId: string;
    studentId?: string;
    page?: number;
  }): Promise<
    Either<
      NotAllowedError | OrganizationNotFoundError | StudentNotFoundError,
      { students: StudentRecord[]; hasNextPage?: boolean }
    >
  > {
    const access = await this.access.resolve(
      input.requestedBy,
      input.organizationId,
    );

    if (access.isLeft()) {
      return left(access.value);
    }

    const role = access.value.membership?.role;
    if (role !== UserRole.ADMIN && role !== UserRole.INSTRUCTOR) {
      return left(new NotAllowedError());
    }

    if (input.studentId) {
      const student = await this.students.findById(
        input.organizationId,
        input.studentId,
      );
      if (!student) {
        return left(new StudentNotFoundError());
      }
      return right({ students: [student] });
    }

    return right(
      await this.students.findByOrganizationId(
        input.organizationId,
        input.page ?? 1,
      ),
    );
  }
}
