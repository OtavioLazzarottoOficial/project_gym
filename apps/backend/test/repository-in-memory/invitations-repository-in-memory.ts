import { InvitationsRepository } from '../../src/domain/accounts/application/repositories/invitations-repository.ts';
import { User } from '../../src/domain/accounts/enterprise/user.ts';
import type { UsersRepositoryInMemory } from './users-repository-in-memory.ts';

export class InvitationsRepositoryInMemory extends InvitationsRepository {
  items: {
    membershipId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    used: boolean;
  }[] = [];
  constructor(private readonly users: UsersRepositoryInMemory) {
    super();
  }

  async issue(input: {
    membershipId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<boolean> {
    const user = await this.users.findById(input.userId);
    if (!user?.isAwaitingPassword) return false;
    this.items = this.items.filter(
      (item) => item.membershipId !== input.membershipId,
    );
    this.items.push({ ...input, used: false });
    return true;
  }

  async consume(input: {
    tokenHash: string;
    passwordHash: string;
    now: Date;
  }): Promise<boolean> {
    const item = this.items.find(
      (invite) =>
        invite.tokenHash === input.tokenHash &&
        !invite.used &&
        invite.expiresAt > input.now,
    );
    if (!item) return false;
    const user = await this.users.findById(item.userId);
    if (!user?.isAwaitingPassword || item.used) return false;
    item.used = true;
    const updated = User.create(
      {
        name: user.name.value,
        email: user.email.value,
        is_platform_admin: user.is_platform_admin,
        password_hash: input.passwordHash,
        created_at: user.created_at,
        updated_at: input.now,
      },
      user.id,
    );
    if (updated.isLeft()) throw updated.value;
    this.users.items = this.users.items.map((existing) =>
      existing.id.equals(user.id) ? updated.value : existing,
    );
    return true;
  }
}
