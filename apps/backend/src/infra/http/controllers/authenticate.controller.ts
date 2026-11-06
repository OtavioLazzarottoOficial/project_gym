import {
  Body,
  Controller,
  Header,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthenticateUserUseCase } from '../../../domain/auth/application/usecases/authenticate-user-usecase.ts';
import { InvalidCredentialsError } from '../../../domain/auth/application/errors/invalid-credentials-error.ts';
import { Public } from '../../auth/public.ts';
import { ZodValidationPipe } from '../pipes/zod-validation-pipe.ts';
import { UserPresenter } from '../presenters/user-presenter.ts';

export const authenticateBodySchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z
    .string()
    .min(1)
    .refine((value) => new TextEncoder().encode(value).byteLength <= 72),
});

@Controller('/sessions')
export class AuthenticateController {
  constructor(private readonly authenticate: AuthenticateUserUseCase) {}

  @Public()
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async handle(
    @Body(new ZodValidationPipe(authenticateBodySchema))
    body: z.infer<typeof authenticateBodySchema>,
  ) {
    const result = await this.authenticate.execute(body);

    if (result.isLeft()) {
      if (result.value instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Email ou senha incorretos.');
      }

      throw result.value;
    }

    return {
      access_token: result.value.access_token,
      expires_at: result.value.expires_at.toISOString(),
      user: UserPresenter.toHTTP(result.value.user),
    };
  }
}
