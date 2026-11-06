import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import type { User } from '../../../accounts/enterprise/user.ts';
import { EmailObjectValue } from '../../../accounts/enterprise/value-objects/email-object-value.ts';
import { UsersRepository } from '../../../accounts/application/repositories/users-repository.ts';
import { HashComparer } from '../crypthograpy/hash-comparer.ts';
import { Encrypter } from '../crypthograpy/encrypter.ts';
import { AuthSessionsRepository } from '../repositories/auth-sessions-repository.ts';
import { AuthSession } from '../../enterprise/auth-session.ts';
import type { InvalidAuthSessionError } from '../../enterprise/errors/invalid-auth-session-error.ts';
import { InvalidCredentialsError } from '../errors/invalid-credentials-error.ts';

export interface AuthenticateUserUseCaseRequest {
  email: string;
  password: string;
}

export type AuthenticateUserUseCaseResponse = Either<
  InvalidCredentialsError | InvalidAuthSessionError,
  {
    access_token: string;
    expires_at: Date;
    user: User;
  }
>;

@Injectable()
export class AuthenticateUserUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly hashComparer: HashComparer,
    private readonly encrypter: Encrypter,
    private readonly sessionsRepository: AuthSessionsRepository,
  ) {}

  async execute(
    request: AuthenticateUserUseCaseRequest,
  ): Promise<AuthenticateUserUseCaseResponse> {
    const email = EmailObjectValue.create(request.email);

    if (
      email.isLeft() ||
      typeof request.password !== 'string' ||
      request.password.length === 0 ||
      new TextEncoder().encode(request.password).byteLength > 72
    ) {
      return left(new InvalidCredentialsError());
    }

    const user = await this.usersRepository.findByEmail(email.value.value);

    if (!user || user.password_hash === null) {
      return left(new InvalidCredentialsError());
    }

    const passwordMatches = await this.hashComparer.compare(
      request.password,
      user.password_hash,
    );

    if (!passwordMatches) {
      return left(new InvalidCredentialsError());
    }

    // JWT NumericDate is expressed in seconds. Align both persisted and signed timestamps.
    const issuedAt = new Date(Math.floor(Date.now() / 1000) * 1000);

    const session = AuthSession.create({
      user_id: user.id,
      created_at: issuedAt,
    });

    if (session.isLeft()) {
      return left(session.value);
    }

    const accessToken = await this.encrypter.encrypty({
      sub: user.id.toString(),
      sid: session.value.id.toString(),
      iat: Math.floor(session.value.created_at.getTime() / 1000),
      exp: Math.floor(session.value.expires_at.getTime() / 1000),
    });

    const saved = await this.sessionsRepository.createIfPasswordMatches(
      session.value,
      user.password_hash,
    );

    if (!saved) {
      return left(new InvalidCredentialsError());
    }

    return right({
      access_token: accessToken,
      expires_at: session.value.expires_at,
      user,
    });
  }
}
