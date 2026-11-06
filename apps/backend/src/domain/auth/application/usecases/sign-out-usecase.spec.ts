import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignOutUseCase } from './sign-out-usecase.ts';
import { ValidateSessionUseCase } from './validate-session-usecase.ts';
import { InvalidSessionError } from '../errors/invalid-session-error.ts';
import { AuthSessionsRepositoryInMemory } from '../../../../../test/repository-in-memory/auth-sessions-repository-in-memory.ts';
import { UsersRepositoryInMemory } from '../../../../../test/repository-in-memory/users-repository-in-memory.ts';
import { makeAuthSession } from '../../../../../test/factories/make-auth-session.ts';
import { makeUser } from '../../../../../test/factories/make-user.ts';

describe('Sign out', () => {
  let sut: SignOutUseCase;
  let sessions: AuthSessionsRepositoryInMemory;
  const now = new Date('2026-11-04T14:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    sessions = new AuthSessionsRepositoryInMemory();
    sut = new SignOutUseCase(sessions);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('revokes only the selected session and makes validation fail while another remains active', async () => {
    const users = new UsersRepositoryInMemory();
    const user = makeUser({ password_hash: 'stored-hash' });
    await users.create(user);
    const current = makeAuthSession({ user_id: user.id, created_at: now });
    const other = makeAuthSession({ user_id: user.id, created_at: now });
    await sessions.create(current);
    await sessions.create(other);
    const validate = new ValidateSessionUseCase(users, sessions);
    const request = {
      userId: user.id.toString(),
      sessionId: current.id.toString(),
    };

    const result = await sut.execute(request);

    expect(result.isRight()).toBe(true);
    expect(result.value).toBeNull();
    expect(current.revoked_at).toEqual(now);
    expect((await validate.execute(request)).isLeft()).toBe(true);
    expect(
      (
        await validate.execute({ ...request, sessionId: other.id.toString() })
      ).isRight(),
    ).toBe(true);
    expect(other.revoked_at).toBeNull();
  });

  it.each(['missing', 'other-owner', 'expired', 'revoked'])(
    'rejects %s without calling the write operation',
    async (scenario) => {
      const session = makeAuthSession({
        created_at: now,
        revoked_at: scenario === 'revoked' ? now : null,
      });

      if (scenario !== 'missing') {
        await sessions.create(session);
      }

      if (scenario === 'expired') {
        vi.setSystemTime(session.expires_at);
      }

      const revoke = vi.spyOn(sessions, 'revokeById');
      const result = await sut.execute({
        userId:
          scenario === 'other-owner'
            ? 'another-user'
            : session.user_id.toString(),
        sessionId: session.id.toString(),
      });

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(InvalidSessionError);
      expect(revoke).not.toHaveBeenCalled();
    },
  );

  it('propagates write failures without returning success', async () => {
    const session = makeAuthSession({ created_at: now });
    await sessions.create(session);
    const failure = new Error('Database unavailable');
    vi.spyOn(sessions, 'revokeById').mockRejectedValueOnce(failure);

    await expect(
      sut.execute({
        userId: session.user_id.toString(),
        sessionId: session.id.toString(),
      }),
    ).rejects.toBe(failure);
    expect(session.revoked_at).toBeNull();
  });
});
