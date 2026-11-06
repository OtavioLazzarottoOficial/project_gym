import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import { PasswordObjectValue } from '../../enterprise/value-objects/password-object-value.ts';
import type { InvalidPasswordError } from '../../enterprise/errors/invalid-password-error.ts';
import { HashGenerator } from '../../../auth/application/crypthograpy/hash-generator.ts';
import { InvitationsRepository } from '../repositories/invitations-repository.ts';
import { InvitationTokens } from '../cryptography/invitation-tokens.ts';
import { InvalidInvitationError } from '../errors/invalid-invitation-error.ts';

@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    private readonly invitations: InvitationsRepository,
    private readonly tokens: InvitationTokens,
    private readonly hashes: HashGenerator,
  ) {}

  async execute(input: {
    token: string;
    password: string;
  }): Promise<Either<InvalidPasswordError | InvalidInvitationError, null>> {
    const password = PasswordObjectValue.create(input.password);
    if (password.isLeft()) return left(password.value);
    if (!/^[a-f0-9]{64}$/.test(input.token))
      return left(new InvalidInvitationError());

    const passwordHash = await this.hashes.hash(password.value.value);
    const consumed = await this.invitations.consume({
      tokenHash: this.tokens.hash(input.token),
      passwordHash,
      now: new Date(),
    });
    if (!consumed) return left(new InvalidInvitationError());
    return right(null);
  }
}
