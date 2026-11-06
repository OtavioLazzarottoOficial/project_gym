import { left, right, type Either } from '../../core/either.ts';
import {
  User,
  type InvalidUserError,
} from '../../domain/accounts/enterprise/user.ts';
import type { HashComparer } from '../../domain/auth/application/crypthograpy/hash-comparer.ts';
import { InvalidCredentialsError } from '../../domain/auth/application/errors/invalid-credentials-error.ts';
import { PasswordObjectValue } from '../../domain/accounts/enterprise/value-objects/password-object-value.ts';
import type { InvalidPasswordError } from '../../domain/accounts/enterprise/errors/invalid-password-error.ts';
import { UserAlreadyExistsError } from '../../domain/accounts/application/errors/user-already-exists-error.ts';
import type { HashGenerator } from '../../domain/auth/application/crypthograpy/hash-generator.ts';
import type { PrismaService } from '../database/prisma/prisma.service.ts';
import { PrismaUserMapper } from '../database/prisma/mappers/prisma-user-mapper.ts';
import { FirstAdministratorAlreadyExistsError } from '../errors/first-administrator-already-exists-error.ts';

type SetupResult = Either<
  | InvalidUserError
  | InvalidPasswordError
  | FirstAdministratorAlreadyExistsError
  | UserAlreadyExistsError
  | InvalidCredentialsError,
  { user: User }
>;

// Local operator setup, deliberately not exposed through HTTP or application startup.
export async function createFirstAdministrator(
  prisma: PrismaService,
  hasher: HashGenerator,
  input: { name: string; email: string; password: string },
  comparer: HashComparer,
): Promise<SetupResult> {
  const password = PasswordObjectValue.create(input.password);

  if (password.isLeft()) {
    return left(password.value);
  }

  const candidate = User.create({
    name: input.name,
    email: input.email,
    is_platform_admin: true,
  });

  if (candidate.isLeft()) {
    return left(candidate.value);
  }

  return prisma.$transaction(async (transaction): Promise<SetupResult> => {
    // Serialize executions of this command, including executions by different processes.
    await transaction.$executeRaw`SELECT pg_advisory_xact_lock(147912, 1)`;
    const administrator = await transaction.user.findFirst({
      where: { is_platform_admin: true },
      select: { id: true },
    });

    if (administrator) {
      return left(new FirstAdministratorAlreadyExistsError());
    }

    const existingEmail = await transaction.user.findUnique({
      where: { email: candidate.value.email.value },
      select: { id: true, password_hash: true },
    });

    if (existingEmail) {
      if (
        !existingEmail.password_hash ||
        !(await comparer.compare(input.password, existingEmail.password_hash))
      ) {
        return left(new InvalidCredentialsError());
      }

      const promoted = await transaction.user.update({
        where: { id: existingEmail.id },
        data: { is_platform_admin: true },
      });

      return right({ user: PrismaUserMapper.toDomain(promoted) });
    }

    const passwordHash = await hasher.hash(password.value.value);
    const stored = await transaction.user.create({
      data: {
        ...PrismaUserMapper.toPrisma(candidate.value),
        password_hash: passwordHash,
      },
    });

    return right({ user: PrismaUserMapper.toDomain(stored) });
  });
}
