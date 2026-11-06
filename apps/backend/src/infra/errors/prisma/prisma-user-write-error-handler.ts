import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../core/either.ts';
import { UserAlreadyExistsError } from '../../../domain/accounts/application/errors/user-already-exists-error.ts';
import { Prisma } from '../../database/prisma/generated/client.ts';

function isEmailConstraint(error: unknown): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002'
  ) {
    return false;
  }

  const meta = error.meta;

  if (meta?.modelName !== 'User') {
    return false;
  }

  const target = meta.target;

  if (Array.isArray(target) && target.length === 1 && target[0] === 'email') {
    return true;
  }

  const driver = meta.driverAdapterError as
    { cause?: { constraint?: { index?: unknown } } } | undefined;

  return driver?.cause?.constraint?.index === 'users_email_key';
}

@Injectable()
export class PrismaUserWriteErrorHandler {
  async execute(
    operation: () => Promise<unknown>,
  ): Promise<Either<UserAlreadyExistsError, null>> {
    try {
      await operation();

      return right(null);
    } catch (error) {
      if (isEmailConstraint(error)) {
        return left(new UserAlreadyExistsError());
      }

      throw error;
    }
  }
}
