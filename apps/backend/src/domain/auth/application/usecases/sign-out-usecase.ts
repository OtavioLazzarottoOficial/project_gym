import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import { AuthSessionsRepository } from '../repositories/auth-sessions-repository.ts';
import { InvalidSessionError } from '../errors/invalid-session-error.ts';

export interface SignOutUseCaseRequest {
  // Derive both values from the authenticated context.
  userId: string;
  sessionId: string;
}

export type SignOutUseCaseResponse = Either<InvalidSessionError, null>;

@Injectable()
export class SignOutUseCase {
  constructor(private readonly sessionsRepository: AuthSessionsRepository) {}

  async execute(
    request: SignOutUseCaseRequest,
  ): Promise<SignOutUseCaseResponse> {
    const session = await this.sessionsRepository.findById(request.sessionId);
    const now = new Date();

    if (
      !session ||
      session.user_id.toString() !== request.userId ||
      !session.isActiveAt(now)
    ) {
      return left(new InvalidSessionError());
    }

    await this.sessionsRepository.revokeById(
      request.sessionId,
      request.userId,
      now,
    );

    return right(null);
  }
}
