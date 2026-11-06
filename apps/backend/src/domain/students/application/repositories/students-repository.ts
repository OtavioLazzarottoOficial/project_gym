import { Injectable } from '@nestjs/common';
import type { Either } from '../../../../core/either.ts';
import type { User } from '../../../accounts/enterprise/user.ts';
import type { NotAllowedError } from '../../../accounts/application/errors/not-allowed-error.ts';
import type { Student } from '../../enterprise/student.ts';
import type { StudentAlreadyExistsError } from '../errors/student-already-exists-error.ts';
import type { StudentIdentityConflictError } from '../errors/student-identity-conflict-error.ts';

@Injectable()
export abstract class StudentsRepository {
  // One atomic operation: resolve global email/CPF, enforce CPF uniqueness, create or reuse the account,
  // create or change the network role to student, and create its student record. Preserve existing passwords.
  // Never attach a CPF to a different account, overwrite another CPF, or expose data from another network.
  // Resolve concurrent creations against persistent constraints and return only the agreed conflicts.
  abstract register(
    user: User,
    student: Student,
    requestedBy: string,
  ): Promise<
    Either<
      | NotAllowedError
      | StudentAlreadyExistsError
      | StudentIdentityConflictError,
      { user: User; student: Student; accountCreated: boolean }
    >
  >;
}
