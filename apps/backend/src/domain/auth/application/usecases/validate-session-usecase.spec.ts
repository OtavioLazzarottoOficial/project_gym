import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidateSessionUseCase } from './validate-session-usecase.ts';
import { InvalidSessionError } from '../errors/invalid-session-error.ts';
import { UsersRepositoryInMemory } from '../../../../../test/repository-in-memory/users-repository-in-memory.ts';
import { AuthSessionsRepositoryInMemory } from '../../../../../test/repository-in-memory/auth-sessions-repository-in-memory.ts';
import { makeUser } from '../../../../../test/factories/make-user.ts';
import { makeAuthSession } from '../../../../../test/factories/make-auth-session.ts';

describe('Validate session', () => {
  let sut: ValidateSessionUseCase;
  let users: UsersRepositoryInMemory;
  let sessions: AuthSessionsRepositoryInMemory;
  const now = new Date('2026-11-04T14:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    users = new UsersRepositoryInMemory();
    sessions = new AuthSessionsRepositoryInMemory();
    sut = new ValidateSessionUseCase(users, sessions);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns the current account and session without extending expiration', async () => {
    const user = makeUser({ password_hash: 'stored-hash' });
    const session = makeAuthSession({ user_id: user.id, created_at: now });
    await users.create(user);
    await sessions.create(session);
    const expiresAt = session.expires_at;
    vi.setSystemTime(new Date(now.getTime() + 60 * 60 * 1000));

    const result = await sut.execute({
      userId: user.id.toString(),
      sessionId: session.id.toString(),
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toEqual({ user, session });
    expect(session.expires_at).toEqual(expiresAt);
  });

  it.each([
    'unknown',
    'other-owner',
    'revoked',
    'expired',
    'before-issuance',
    'missing-account',
    'pending-account',
  ])('rejects %s sessions', async (scenario) => {
    const user = makeUser({
      password_hash: scenario === 'pending-account' ? null : 'stored-hash',
    });
    const session = makeAuthSession({
      user_id: user.id,
      created_at: now,
      revoked_at: scenario === 'revoked' ? now : null,
    });

    if (scenario !== 'missing-account') {
      await users.create(user);
    }

    if (scenario !== 'unknown') {
      await sessions.create(session);
    }

    if (scenario === 'expired') {
      vi.setSystemTime(session.expires_at);
    }

    if (scenario === 'before-issuance') {
      vi.setSystemTime(new Date(now.getTime() - 1));
    }

    const result = await sut.execute({
      userId:
        scenario === 'other-owner'
          ? makeUser().id.toString()
          : user.id.toString(),
      sessionId: session.id.toString(),
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidSessionError);
    expect(session.expires_at.getTime()).toBe(
      now.getTime() + 8 * 60 * 60 * 1000,
    );
  });

  it('accepts the last millisecond before expiry and rejects the exact boundary', async () => {
    const user = makeUser({ password_hash: 'stored-hash' });
    const session = makeAuthSession({ user_id: user.id, created_at: now });
    await users.create(user);
    await sessions.create(session);
    const request = {
      userId: user.id.toString(),
      sessionId: session.id.toString(),
    };
    vi.setSystemTime(new Date(session.expires_at.getTime() - 1));
    expect((await sut.execute(request)).isRight()).toBe(true);
    vi.setSystemTime(session.expires_at);
    expect((await sut.execute(request)).isLeft()).toBe(true);
  });

  it('propagates repository failures rather than treating them as missing sessions', async () => {
    const failure = new Error('Database unavailable');
    vi.spyOn(sessions, 'findById').mockRejectedValueOnce(failure);

    await expect(
      sut.execute({ userId: 'user', sessionId: 'session' }),
    ).rejects.toBe(failure);
  });
});
