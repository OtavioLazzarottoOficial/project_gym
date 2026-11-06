import {
  BadRequestException,
  Body,
  Controller,
  Header,
  HttpCode,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { ChangePasswordUseCase } from '../../../domain/accounts/application/usecases/change-password-usecase.ts';
import { IncorrectCurrentPasswordError } from '../../../domain/accounts/application/errors/incorrect-current-password-error.ts';
import { InvalidPasswordError } from '../../../domain/accounts/enterprise/errors/invalid-password-error.ts';
import { InvalidSessionError } from '../../../domain/auth/application/errors/invalid-session-error.ts';
import { CurrentUser } from '../../auth/current-user-decorator.ts';
import type { UserPayload } from '../../auth/jwt.strategy.ts';
import { ZodValidationPipe } from '../pipes/zod-validation-pipe.ts';

const schema = z.strictObject({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().max(256),
});

@Controller('/me/password')
export class ChangePasswordController {
  constructor(private readonly changePassword: ChangePasswordUseCase) {}

  @Patch()
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async handle(
    @CurrentUser() current: UserPayload,
    @Body(new ZodValidationPipe(schema)) body: z.infer<typeof schema>,
  ) {
    const result = await this.changePassword.execute({
      userId: current.sub,
      ...body,
    });
    if (result.isLeft()) {
      if (result.value instanceof InvalidSessionError)
        throw new UnauthorizedException('Sessão inválida ou expirada.');
      if (result.value instanceof IncorrectCurrentPasswordError)
        throw new BadRequestException('Senha atual incorreta.');
      if (result.value instanceof InvalidPasswordError)
        throw new BadRequestException(
          'A nova senha não atende à política de segurança.',
        );
      throw result.value;
    }
  }
}
