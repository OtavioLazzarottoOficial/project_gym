import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import type { User } from '../../../accounts/enterprise/user.ts';
import type { AuthSession } from '../../enterprise/auth-session.ts';
import { UsersRepository } from '../../../accounts/application/repositories/users-repository.ts';
import { AuthSessionsRepository } from '../repositories/auth-sessions-repository.ts';
import { InvalidSessionError } from '../errors/invalid-session-error.ts';

export interface ValidateSessionUseCaseRequest {
  // Values must come from a previously verified JWT, never an untrusted request body.
  userId: string;
  sessionId: string;
}

export type ValidateSessionUseCaseResponse = Either<
  InvalidSessionError,
  { user: User; session: AuthSession }
>;

@Injectable()
export class ValidateSessionUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly sessionsRepository: AuthSessionsRepository,
  ) {}

  async execute(
    request: ValidateSessionUseCaseRequest,
  ): Promise<ValidateSessionUseCaseResponse> {
    const session = await this.sessionsRepository.findById(request.sessionId);

    if (
      !session ||
      session.user_id.toString() !== request.userId ||
      !session.isActiveAt(new Date())
    ) {
      return left(new InvalidSessionError());
    }

    const user = await this.usersRepository.findById(request.userId);

    if (!user || user.isAwaitingPassword) {
      return left(new InvalidSessionError());
    }

    return right({ user, session });
  }
}
