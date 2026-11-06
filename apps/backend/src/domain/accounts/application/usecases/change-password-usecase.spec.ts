import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordUseCase } from './change-password-usecase.ts';
import { IncorrectCurrentPasswordError } from '../errors/incorrect-current-password-error.ts';
import { InvalidPasswordError } from '../../enterprise/errors/invalid-password-error.ts';
import { makeUser } from '../../../../../test/factories/make-user.ts';
import { makeAuthSession } from '../../../../../test/factories/make-auth-session.ts';
import { UsersRepositoryInMemory } from '../../../../../test/repository-in-memory/users-repository-in-memory.ts';
import { AuthSessionsRepositoryInMemory } from '../../../../../test/repository-in-memory/auth-sessions-repository-in-memory.ts';
import { PasswordChangesRepositoryInMemory } from '../../../../../test/repository-in-memory/password-changes-repository-in-memory.ts';
import { FakerEncrypter } from '../../../../../test/cryphograpy/faker-encrypter.ts';

describe('Change password', () => {
  let users: UsersRepositoryInMemory;
  let sessions: AuthSessionsRepositoryInMemory;
  let changes: PasswordChangesRepositoryInMemory;
  let sut: ChangePasswordUseCase;
  let userId: string;
  let otherUserId: string;
  let oldHash: string;
  const oldPassword = 'OldPassword123';
  const newPassword = 'NewPassword456';

  beforeEach(async () => {
    users = new UsersRepositoryInMemory();
    sessions = new AuthSessionsRepositoryInMemory();
    changes = new PasswordChangesRepositoryInMemory(users, sessions);
    const hasher = new FakerEncrypter();
    oldHash = await hasher.hash(oldPassword);
    const user = makeUser({ password_hash: oldHash });
    const other = makeUser({ password_hash: oldHash });
    userId = user.id.toString();
    otherUserId = other.id.toString();
    await users.create(user);
    await users.create(other);
    await sessions.create(makeAuthSession({ user_id: user.id }));
    await sessions.create(makeAuthSession({ user_id: user.id }));
    await sessions.create(makeAuthSession({ user_id: other.id }));
    sut = new ChangePasswordUseCase(users, changes, hasher, hasher);
  });

  it('changes the hash and revokes all sessions for only that identity', async () => {
    const result = await sut.execute({
      userId,
      currentPassword: oldPassword,
      newPassword,
    });
    expect(result.isRight()).toBe(true);
    expect((await users.findById(userId))?.password_hash).toBe(
      'hashed-NewPassword456',
    );
    expect(
      sessions.items
        .filter((item) => item.user_id.toString() === userId)
        .every((item) => item.revoked_at !== null),
    ).toBe(true);
    expect(
      sessions.items.find((item) => item.user_id.toString() === otherUserId)
        ?.revoked_at,
    ).toBeNull();
  });

  it('rejects the wrong current password without changes', async () => {
    const result = await sut.execute({
      userId,
      currentPassword: 'Incorrect123',
      newPassword,
    });
    expect(result.value).toBeInstanceOf(IncorrectCurrentPasswordError);
    expect((await users.findById(userId))?.password_hash).toBe(oldHash);
    expect(sessions.items.every((item) => item.revoked_at === null)).toBe(true);
  });

  it('rejects an invalid new password without changes', async () => {
    const result = await sut.execute({
      userId,
      currentPassword: oldPassword,
      newPassword: 'weak',
    });
    expect(result.value).toBeInstanceOf(InvalidPasswordError);
    expect((await users.findById(userId))?.password_hash).toBe(oldHash);
    expect(sessions.items.every((item) => item.revoked_at === null)).toBe(true);
  });

  it('rejects a stale verified password if another change wins', async () => {
    vi.spyOn(changes, 'changeAndRevoke').mockResolvedValueOnce(false);
    const result = await sut.execute({
      userId,
      currentPassword: oldPassword,
      newPassword,
    });
    expect(result.value).toBeInstanceOf(IncorrectCurrentPasswordError);
    expect((await users.findById(userId))?.password_hash).toBe(oldHash);
    expect(sessions.items.every((item) => item.revoked_at === null)).toBe(true);
  });
});
