import { beforeEach, describe, expect, it } from 'vitest';
import { AuthSession, AUTH_SESSION_DURATION_MS } from './auth-session.ts';
import { InvalidAuthSessionError } from './errors/invalid-auth-session-error.ts';
import { UniqueEntityID } from '../../../core/entities/unique-entity-id.ts';
import { makeAuthSession } from '../../../../test/factories/make-auth-session.ts';

describe('AuthSession', () => {
  let now: Date;

  beforeEach(() => {
    now = new Date('2026-11-04T14:00:00Z');
  });

  it('creates a session with fixed expiration, factory overrides and optional ID', () => {
    const id = new UniqueEntityID('restored-session');
    const userId = new UniqueEntityID('owner');
    const session = makeAuthSession({ user_id: userId, created_at: now }, id);

    expect(session.id).toBe(id);
    expect(session.user_id).toBe(userId);
    expect(session.expires_at.getTime()).toBe(
      now.getTime() + AUTH_SESSION_DURATION_MS,
    );
    expect(session.revoked_at).toBeNull();
    expect(session.isActiveAt(now)).toBe(true);
    expect(session.isActiveAt(session.expires_at)).toBe(false);
  });

  it.each([
    { user_id: new UniqueEntityID('') },
    { created_at: new Date('invalid') },
    { expires_at: new Date('invalid') },
    { expires_at: new Date('2026-11-04T23:00:00Z') },
    { revoked_at: new Date('invalid') },
    { revoked_at: new Date('2026-11-03T00:00:00Z') },
  ])('returns Left for invalid session data %j', (overrides) => {
    const result = AuthSession.create({
      user_id: new UniqueEntityID('owner'),
      created_at: now,
      ...overrides,
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidAuthSessionError);
  });

  it('copies timestamps on construction and access', () => {
    const session = makeAuthSession({ created_at: now });
    now.setFullYear(2000);
    session.created_at.setFullYear(2000);
    session.expires_at.setFullYear(2000);

    expect(session.created_at.getUTCFullYear()).toBe(2026);
    expect(session.expires_at.getUTCFullYear()).toBe(2026);
  });

  it('revokes without changing expiration or replacing an existing revocation', () => {
    const session = makeAuthSession({ created_at: now });
    const expiration = session.expires_at;

    expect(session.revoke(now).isRight()).toBe(true);
    expect(session.revoke(new Date(now.getTime() + 1000)).isRight()).toBe(true);
    expect(session.revoked_at).toEqual(now);
    expect(session.expires_at).toEqual(expiration);
    expect(session.isActiveAt(now)).toBe(false);
  });

  it('rejects invalid revocation dates without mutation', () => {
    const session = makeAuthSession({ created_at: now });

    expect(session.revoke(new Date('invalid')).isLeft()).toBe(true);
    expect(session.revoke(new Date(now.getTime() - 1)).isLeft()).toBe(true);
    expect(session.revoked_at).toBeNull();
  });
});
