import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import { PasswordObjectValue } from '../../enterprise/value-objects/password-object-value.ts';
import type { InvalidPasswordError } from '../../enterprise/errors/invalid-password-error.ts';
import { InvalidSessionError } from '../../../auth/application/errors/invalid-session-error.ts';
import { HashComparer } from '../../../auth/application/crypthograpy/hash-comparer.ts';
import { HashGenerator } from '../../../auth/application/crypthograpy/hash-generator.ts';
import { UsersRepository } from '../repositories/users-repository.ts';
import { PasswordChangesRepository } from '../repositories/password-changes-repository.ts';
import { IncorrectCurrentPasswordError } from '../errors/incorrect-current-password-error.ts';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly changes: PasswordChangesRepository,
    private readonly comparer: HashComparer,
    private readonly hasher: HashGenerator,
  ) {}

  async execute(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<
    Either<
      | InvalidSessionError
      | IncorrectCurrentPasswordError
      | InvalidPasswordError,
      null
    >
  > {
    const newPassword = PasswordObjectValue.create(input.newPassword);
    if (newPassword.isLeft()) return left(newPassword.value);
    const user = await this.users.findById(input.userId);
    if (!user || !user.password_hash) return left(new InvalidSessionError());
    if (
      !input.currentPassword ||
      new TextEncoder().encode(input.currentPassword).byteLength > 72 ||
      !(await this.comparer.compare(input.currentPassword, user.password_hash))
    )
      return left(new IncorrectCurrentPasswordError());
    const newHash = await this.hasher.hash(newPassword.value.value);
    const changed = await this.changes.changeAndRevoke({
      userId: input.userId,
      expectedHash: user.password_hash,
      newHash,
    });
    if (!changed) return left(new IncorrectCurrentPasswordError());
    return right(null);
  }
}
