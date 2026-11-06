import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../core/either.ts';
import { NotAllowedError } from '../../../domain/accounts/application/errors/not-allowed-error.ts';
import { StudentAlreadyExistsError } from '../../../domain/students/application/errors/student-already-exists-error.ts';
import { StudentIdentityConflictError } from '../../../domain/students/application/errors/student-identity-conflict-error.ts';
import { Prisma } from '../../database/prisma/generated/client.ts';

function uniqueConstraint(
  error: unknown,
  model: string,
  fields: string[],
  index: string,
): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002' ||
    error.meta?.modelName !== model
  )
    return false;
  const target = error.meta.target;
  const driver = error.meta.driverAdapterError as
    { cause?: { constraint?: { index?: unknown } } } | undefined;
  return (
    (Array.isArray(target) &&
      target.length === fields.length &&
      fields.every((field) => target.includes(field))) ||
    driver?.cause?.constraint?.index === index
  );
}

@Injectable()
export class PrismaStudentWriteErrorHandler {
  async execute<T>(
    operation: () => Promise<T>,
  ): Promise<
    Either<
      | NotAllowedError
      | StudentAlreadyExistsError
      | StudentIdentityConflictError,
      T
    >
  > {
    for (let attempt = 0; ; attempt++) {
      try {
        return right(await operation());
      } catch (error) {
        if (
          error instanceof NotAllowedError ||
          error instanceof StudentAlreadyExistsError ||
          error instanceof StudentIdentityConflictError
        )
          return left(error);
        if (uniqueConstraint(error, 'User', ['cpf'], 'users_cpf_key'))
          return left(new StudentIdentityConflictError());
        if (
          uniqueConstraint(
            error,
            'Student',
            ['membership_id'],
            'students_membership_key',
          ) ||
          uniqueConstraint(
            error,
            'Student',
            ['membership_id', 'organization_id'],
            'students_membership_organization_key',
          )
        )
          return left(new StudentAlreadyExistsError());
        if (
          attempt === 0 &&
          uniqueConstraint(error, 'User', ['email'], 'users_email_key')
        )
          continue;
        throw error;
      }
    }
  }
}
