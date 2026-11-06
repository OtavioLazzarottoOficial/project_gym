import { UniqueEntityID } from '../../../../core/entities/unique-entity-id.ts';
import { User } from '../../../../domain/accounts/enterprise/user.ts';
import { InvalidPersistedUserError } from '../../../errors/invalid-persisted-user-error.ts';
import type { User as PrismaUser, Prisma } from '../generated/client.ts';

export class PrismaUserMapper {
  static toDomain(raw: PrismaUser): User {
    const result = User.create(
      {
        name: raw.name,
        email: raw.email,
        is_platform_admin: raw.is_platform_admin,
        password_hash: raw.password_hash,
        created_at: raw.created_at,
        updated_at: raw.updated_at,
      },
      new UniqueEntityID(raw.id),
    );

    if (
      result.isLeft() ||
      typeof raw.is_platform_admin !== 'boolean' ||
      !raw.id ||
      !Number.isFinite(raw.created_at.getTime()) ||
      (raw.updated_at !== null && !Number.isFinite(raw.updated_at.getTime())) ||
      (raw.password_hash !== null && !raw.password_hash.trim())
    ) {
      throw new InvalidPersistedUserError();
    }

    if (result.value.email.value !== raw.email) {
      throw new InvalidPersistedUserError();
    }

    return result.value;
  }

  static toPrisma(user: User): Prisma.UserUncheckedCreateInput {
    return {
      id: user.id.toString(),
      name: user.name.value,
      email: user.email.value,
      is_platform_admin: user.is_platform_admin,
      password_hash: user.password_hash,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}
