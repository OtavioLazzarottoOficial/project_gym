import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../core/either.ts';
import { Prisma } from '../../database/prisma/generated/client.ts';
import { MembershipAlreadyExistsError } from '../../../domain/organizations/application/errors/membership-already-exists-error.ts';

function uniqueConstraint(
  error: unknown,
  model: string,
  fields: string[],
  index: string,
) {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== 'P2002' ||
    error.meta?.modelName !== model
  ) {
    return false;
  }

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
export class PrismaMembershipWriteErrorHandler {
  async execute<T>(
    operation: () => Promise<T>,
  ): Promise<Either<MembershipAlreadyExistsError, T>> {
    for (let attempt = 0; ; attempt++) {
      try {
        return right(await operation());
      } catch (error) {
        if (
          uniqueConstraint(
            error,
            'Membership',
            ['organization_id', 'user_id'],
            'memberships_organization_user_key',
          )
        ) {
          return left(new MembershipAlreadyExistsError());
        }

        // Another network may create the same global identity concurrently; retry only that known conflict once.
        if (
          attempt === 0 &&
          uniqueConstraint(error, 'User', ['email'], 'users_email_key')
        ) {
          continue;
        }

        throw error;
      }
    }
  }
}
