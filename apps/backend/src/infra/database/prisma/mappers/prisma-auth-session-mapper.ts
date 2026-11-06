import { UniqueEntityID } from '../../../../core/entities/unique-entity-id.ts';
import { AuthSession } from '../../../../domain/auth/enterprise/auth-session.ts';
import { InvalidPersistedAuthSessionError } from '../../../errors/invalid-persisted-auth-session-error.ts';
import type {
  AuthSession as PrismaAuthSession,
  Prisma,
} from '../generated/client.ts';

export class PrismaAuthSessionMapper {
  static toDomain(raw: PrismaAuthSession): AuthSession {
    if (
      typeof raw.id !== 'string' ||
      typeof raw.user_id !== 'string' ||
      !raw.id.trim() ||
      !raw.user_id.trim() ||
      !(raw.created_at instanceof Date) ||
      !(raw.expires_at instanceof Date) ||
      (raw.revoked_at !== null && !(raw.revoked_at instanceof Date))
    ) {
      throw new InvalidPersistedAuthSessionError();
    }

    const result = AuthSession.create(
      {
        user_id: new UniqueEntityID(raw.user_id),
        created_at: raw.created_at,
        expires_at: raw.expires_at,
        revoked_at: raw.revoked_at,
      },
      new UniqueEntityID(raw.id),
    );

    if (result.isLeft()) {
      throw new InvalidPersistedAuthSessionError();
    }

    return result.value;
  }

  static toPrisma(
    session: AuthSession,
  ): Prisma.AuthSessionUncheckedCreateInput {
    return {
      id: session.id.toString(),
      user_id: session.user_id.toString(),
      created_at: session.created_at,
      expires_at: session.expires_at,
      revoked_at: session.revoked_at,
    };
  }
}
