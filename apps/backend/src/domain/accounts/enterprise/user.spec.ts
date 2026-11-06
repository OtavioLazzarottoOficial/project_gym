import { describe, expect, it } from 'vitest';
import { UniqueEntityID } from '../../../core/entities/unique-entity-id.ts';
import { User } from './user.ts';
import { makeUser } from '../../../../test/factories/make-user.ts';

describe('User', () => {
  it('creates an account awaiting password definition without storing a raw password', () => {
    const user = makeUser({
      name: 'Maria Silva',
      email: ' MARIA@example.com ',
    });

    expect(user.email.value).toBe('maria@example.com');
    expect(user.password_hash).toBeNull();
    expect(user.isAwaitingPassword).toBe(true);
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeNull();
  });

  it('supports factory overrides and reconstitution with an existing ID, hash and timestamps', () => {
    const id = new UniqueEntityID('existing-user');
    const createdAt = new Date('2026-01-01T00:00:00Z');
    const updatedAt = new Date('2026-01-02T00:00:00Z');
    const user = makeUser(
      {
        name: 'Existing user',
        password_hash: 'stored-hash',
        created_at: createdAt,
        updated_at: updatedAt,
      },
      id,
    );

    expect(user.id).toBe(id);
    expect(user.name.value).toBe('Existing user');
    expect(user.isAwaitingPassword).toBe(false);
    expect(user.created_at).toEqual(createdAt);
    expect(user.updated_at).toEqual(updatedAt);
    createdAt.setFullYear(2000);
    user.updated_at?.setFullYear(2000);
    expect(user.created_at.getUTCFullYear()).toBe(2026);
    expect(user.updated_at?.getUTCFullYear()).toBe(2026);
  });

  it('does not create an entity when its platform access is invalid at runtime', () => {
    const result = User.create({
      name: 'Maria',
      email: 'maria@example.com',
      is_platform_admin: 'invalid' as unknown as boolean,
    });

    expect(result.isLeft()).toBe(true);
  });
});
