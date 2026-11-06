import { PasswordChangesRepository } from '../../src/domain/accounts/application/repositories/password-changes-repository.ts';
import { User } from '../../src/domain/accounts/enterprise/user.ts';
import type { UsersRepositoryInMemory } from './users-repository-in-memory.ts';
import type { AuthSessionsRepositoryInMemory } from './auth-sessions-repository-in-memory.ts';

export class PasswordChangesRepositoryInMemory extends PasswordChangesRepository {
  constructor(
    private readonly users: UsersRepositoryInMemory,
    private readonly sessions: AuthSessionsRepositoryInMemory,
  ) {
    super();
  }
  async changeAndRevoke(input: {
    userId: string;
    expectedHash: string;
    newHash: string;
  }): Promise<boolean> {
    const user = await this.users.findById(input.userId);
    if (!user || user.password_hash !== input.expectedHash) return false;
    const replacement = User.create(
      {
        name: user.name.value,
        email: user.email.value,
        is_platform_admin: user.is_platform_admin,
        password_hash: input.newHash,
        created_at: user.created_at,
        updated_at: new Date(),
      },
      user.id,
    );
    if (replacement.isLeft()) throw replacement.value;
    this.users.items = this.users.items.map((item) =>
      item.id.equals(user.id) ? replacement.value : item,
    );
    for (const session of this.sessions.items) {
      if (session.user_id.equals(user.id)) {
        const revoked = session.revoke(new Date());
        if (revoked.isLeft()) throw revoked.value;
      }
    }
    return true;
  }
}
