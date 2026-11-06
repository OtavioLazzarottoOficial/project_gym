import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from './jwt.strategy.ts';

export const CurrentUser = createParamDecorator(
  (_: never, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user: UserPayload }>();

    return request.user;
  },
);
