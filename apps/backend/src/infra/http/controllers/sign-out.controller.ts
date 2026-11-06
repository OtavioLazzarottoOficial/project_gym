import {
  Controller,
  Delete,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { SignOutUseCase } from '../../../domain/auth/application/usecases/sign-out-usecase.ts';
import { InvalidSessionError } from '../../../domain/auth/application/errors/invalid-session-error.ts';
import { CurrentUser } from '../../auth/current-user-decorator.ts';
import type { UserPayload } from '../../auth/jwt.strategy.ts';

@Controller('/sessions/current')
export class SignOutController {
  constructor(private readonly signOut: SignOutUseCase) {}

  @Delete()
  @HttpCode(204)
  async handle(@CurrentUser() current: UserPayload) {
    const result = await this.signOut.execute({
      userId: current.sub,
      sessionId: current.sid,
    });

    if (result.isLeft()) {
      if (result.value instanceof InvalidSessionError) {
        throw new UnauthorizedException('Sessão inválida ou expirada.');
      }

      throw result.value;
    }
  }
}
