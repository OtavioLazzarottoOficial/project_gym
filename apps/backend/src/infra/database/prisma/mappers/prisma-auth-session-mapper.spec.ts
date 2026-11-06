import { describe, expect, it } from 'vitest';
import { PrismaAuthSessionMapper } from './prisma-auth-session-mapper.ts';
import { InvalidPersistedAuthSessionError } from '../../../errors/invalid-persisted-auth-session-error.ts';
import { UniqueEntityID } from '../../../../core/entities/unique-entity-id.ts';
import { makeAuthSession } from '../../../../../test/factories/make-auth-session.ts';
import type { AuthSession as PrismaAuthSession } from '../generated/client.ts';

describe('PrismaAuthSessionMapper', () => {
  const createdAt = new Date('2026-11-04T14:00:00.123Z');

  it.each([null, new Date('2026-11-04T15:00:00.123Z')])(
    'round trips identity, owner, dates and revocation %j',
    (revokedAt) => {
      const original = makeAuthSession(
        {
          user_id: new UniqueEntityID('owner'),
          created_at: createdAt,
          revoked_at: revokedAt,
        },
        new UniqueEntityID('session'),
      );
      const raw = PrismaAuthSessionMapper.toPrisma(
        original,
      ) as PrismaAuthSession;
      const restored = PrismaAuthSessionMapper.toDomain(raw);

      expect(restored.id.equals(original.id)).toBe(true);
      expect(restored.user_id.equals(original.user_id)).toBe(true);
      expect(restored.created_at).toEqual(original.created_at);
      expect(restored.expires_at).toEqual(original.expires_at);
      expect(restored.revoked_at).toEqual(revokedAt);
    },
  );

  it.each([
    { id: '' },
    { user_id: '' },
    { created_at: new Date('invalid') },
    { created_at: null },
    { expires_at: new Date('invalid') },
    { expires_at: null },
    { expires_at: new Date('2026-11-05T00:00:00Z') },
    { revoked_at: new Date('invalid') },
    { revoked_at: new Date('2026-11-03T00:00:00Z') },
  ])(
    'rejects inconsistent stored data %j without returning a partial session',
    (overrides) => {
      const raw = {
        ...PrismaAuthSessionMapper.toPrisma(
          makeAuthSession({ created_at: createdAt }),
        ),
        ...overrides,
      } as PrismaAuthSession;

      expect(() => PrismaAuthSessionMapper.toDomain(raw)).toThrow(
        InvalidPersistedAuthSessionError,
      );
      expect(() => PrismaAuthSessionMapper.toDomain(raw)).toThrow(
        'Persisted authentication session data is incompatible',
      );
    },
  );
});
