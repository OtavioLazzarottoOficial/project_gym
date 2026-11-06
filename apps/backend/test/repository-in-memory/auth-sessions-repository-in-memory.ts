import { AuthSessionsRepository } from '../../src/domain/auth/application/repositories/auth-sessions-repository.ts';
import type { AuthSession } from '../../src/domain/auth/enterprise/auth-session.ts';

export class AuthSessionsRepositoryInMemory extends AuthSessionsRepository {
  items: AuthSession[] = [];

  async create(session: AuthSession): Promise<void> {
    this.items.push(session);
  }

  async createIfPasswordMatches(
    session: AuthSession,
    _expectedHash: string,
  ): Promise<boolean> {
    await this.create(session);
    return true;
  }

  async findById(id: string): Promise<AuthSession | null> {
    return this.items.find((session) => session.id.toString() === id) ?? null;
  }

  async revokeById(id: string, userId: string, at: Date): Promise<void> {
    const session = this.items.find(
      (item) => item.id.toString() === id && item.user_id.toString() === userId,
    );

    if (session) {
      const result = session.revoke(at);

      if (result.isLeft()) {
        throw result.value;
      }
    }
  }
}
