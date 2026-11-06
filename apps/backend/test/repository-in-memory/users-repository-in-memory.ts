import { left, right, type Either } from '../../src/core/either.ts';
import { UsersRepository } from '../../src/domain/accounts/application/repositories/users-repository.ts';
import { UserAlreadyExistsError } from '../../src/domain/accounts/application/errors/user-already-exists-error.ts';
import type { User } from '../../src/domain/accounts/enterprise/user.ts';

export class UsersRepositoryInMemory extends UsersRepository {
  items: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.items.find((user) => user.id.toString() === id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.items.find((user) => user.email.value === email) ?? null;
  }

  async create(user: User): Promise<Either<UserAlreadyExistsError, null>> {
    if (this.items.some((item) => item.email.equals(user.email))) {
      return left(new UserAlreadyExistsError());
    }

    this.items.push(user);

    return right(null);
  }
}
