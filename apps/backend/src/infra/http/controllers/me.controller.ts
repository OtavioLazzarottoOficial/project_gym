import { Controller, Get, Header } from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user-decorator.ts';
import type { UserPayload } from '../../auth/jwt.strategy.ts';
import { UserPresenter } from '../presenters/user-presenter.ts';

@Controller('/me')
export class MeController {
  @Get()
  @Header('Cache-Control', 'no-store')
  handle(@CurrentUser() current: UserPayload) {
    return { user: UserPresenter.toHTTP(current.user) };
  }
}
