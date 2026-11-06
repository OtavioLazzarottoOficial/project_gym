import { describe, expect, it } from 'vitest';
import { PrismaUserMapper } from './prisma-user-mapper.ts';
import { InvalidPersistedUserError } from '../../../errors/invalid-persisted-user-error.ts';
import { makeUser } from '../../../../../test/factories/make-user.ts';
import type { User as PrismaUser } from '../generated/client.ts';

describe('PrismaUserMapper', () => {
  it.each([false, true])(
    'round trips identity, role %s, timestamps and pending password',
    (isPlatformAdmin) => {
      const original = makeUser({
        is_platform_admin: isPlatformAdmin,
        name: 'a'.repeat(120),
        created_at: new Date('2026-01-01T10:00:00Z'),
      });
      const raw = PrismaUserMapper.toPrisma(original) as PrismaUser;
      const restored = PrismaUserMapper.toDomain(raw);

      expect(restored.id.equals(original.id)).toBe(true);
      expect(restored.name.equals(original.name)).toBe(true);
      expect(restored.email.equals(original.email)).toBe(true);
      expect(restored.is_platform_admin).toBe(isPlatformAdmin);
      expect(restored.password_hash).toBeNull();
      expect(restored.updated_at).toBeNull();
      expect(restored.created_at).toEqual(original.created_at);
    },
  );

  it('restores a stored hash without applying raw password policy', () => {
    const original = makeUser({
      password_hash: 'stored-hash',
      updated_at: new Date('2026-02-01T00:00:00Z'),
    });
    const restored = PrismaUserMapper.toDomain(
      PrismaUserMapper.toPrisma(original) as PrismaUser,
    );

    expect(restored.password_hash).toBe('stored-hash');
    expect(restored.updated_at).toEqual(original.updated_at);
    expect(restored.isAwaitingPassword).toBe(false);
  });

  it.each([
    { name: '' },
    { email: 'invalid' },
    { email: ' CASE@EXAMPLE.COM ' },
    { is_platform_admin: 'invalid' },
    { created_at: new Date('invalid') },
    { updated_at: new Date('invalid') },
    { password_hash: '' },
    { id: '' },
  ])(
    'rejects incompatible stored data without leaking secrets: %j',
    (overrides) => {
      const raw = {
        ...PrismaUserMapper.toPrisma(makeUser()),
        password_hash: 'private-stored-hash',
        ...overrides,
      } as PrismaUser;

      expect(() => PrismaUserMapper.toDomain(raw)).toThrow(
        InvalidPersistedUserError,
      );
      expect(() => PrismaUserMapper.toDomain(raw)).toThrow(
        'Persisted user data is incompatible',
      );
    },
  );
});
