import { describe, expect, it } from 'vitest';
import { UserPresenter } from './user-presenter.ts';
import { makeUser } from '../../../../test/factories/make-user.ts';

describe('UserPresenter', () => {
  it('serializes only public fields, converting identity, value objects and dates', () => {
    const user = makeUser({
      name: 'Maria',
      email: ' MARIA@EXAMPLE.COM ',
      password_hash: 'private-hash',
      updated_at: new Date('2026-01-02T00:00:00Z'),
    });
    const result = UserPresenter.toHTTP(user);

    expect(result).toEqual({
      id: user.id.toString(),
      name: 'Maria',
      email: 'maria@example.com',
      is_platform_admin: false,
      awaiting_password: false,
      created_at: user.created_at.toISOString(),
      updated_at: '2026-01-02T00:00:00.000Z',
    });
    expect(JSON.stringify(result)).not.toContain('private-hash');
    expect(result).not.toHaveProperty('password_hash');
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('props');
  });

  it('represents a pending account with null updated_at', () => {
    const result = UserPresenter.toHTTP(makeUser());

    expect(result.awaiting_password).toBe(true);
    expect(result.updated_at).toBeNull();
  });
});
