import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { IssueInvitationUseCase } from '../../../domain/accounts/application/usecases/issue-invitation-usecase.ts';
import { ReissueInvitationByEmailUseCase } from '../../../domain/accounts/application/usecases/reissue-invitation-by-email-usecase.ts';
import { AcceptInvitationUseCase } from '../../../domain/accounts/application/usecases/accept-invitation-usecase.ts';
import { NotAllowedError } from '../../../domain/accounts/application/errors/not-allowed-error.ts';
import { OrganizationNotFoundError } from '../../../domain/organizations/application/errors/organization-not-found-error.ts';
import { InvalidInvitationError } from '../../../domain/accounts/application/errors/invalid-invitation-error.ts';
import { InvalidPasswordError } from '../../../domain/accounts/enterprise/errors/invalid-password-error.ts';
import { CurrentUser } from '../../auth/current-user-decorator.ts';
import type { UserPayload } from '../../auth/jwt.strategy.ts';
import { Public } from '../../auth/public.ts';
import { ZodValidationPipe } from '../pipes/zod-validation-pipe.ts';
import { InvitationPresenter } from '../presenters/invitation-presenter.ts';

const acceptSchema = z.strictObject({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().max(256),
});

@Controller()
export class InvitationsController {
  constructor(
    private readonly issue: IssueInvitationUseCase,
    private readonly accept: AcceptInvitationUseCase,
    private readonly presenter: InvitationPresenter,
    private readonly reissueEmail: ReissueInvitationByEmailUseCase,
  ) {}

  @Post('/organizations/:organizationId/users/:userId/invitation')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async reissue(
    @CurrentUser() currentUser: UserPayload,
    @Param('organizationId', new ZodValidationPipe(z.uuid()))
    organizationId: string,
    @Param('userId', new ZodValidationPipe(z.uuid())) userId: string,
  ) {
    const result = await this.issue.execute({
      requestedBy: currentUser.sub,
      organizationId,
      userId,
    });
    if (result.isLeft()) {
      if (result.value instanceof NotAllowedError)
        throw new ForbiddenException();
      if (
        result.value instanceof OrganizationNotFoundError ||
        result.value instanceof InvalidInvitationError
      )
        throw new NotFoundException();
      throw result.value;
    }
    return { invitation: this.presenter.toHTTP(result.value) };
  }

  @Post('/organizations/:organizationId/invitations')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async reissueByEmail(
    @CurrentUser() currentUser: UserPayload,
    @Param('organizationId', new ZodValidationPipe(z.uuid()))
    organizationId: string,
    @Body(
      new ZodValidationPipe(
        z.strictObject({
          email: z.string().trim().toLowerCase().pipe(z.email()),
        }),
      ),
    )
    body: { email: string },
  ) {
    const result = await this.reissueEmail.execute({
      requestedBy: currentUser.sub,
      organizationId,
      email: body.email,
    });
    if (result.isLeft()) {
      if (result.value instanceof NotAllowedError)
        throw new ForbiddenException();
      throw new NotFoundException('Conta não encontrada nesta rede.');
    }
    return { invitation: this.presenter.toHTTP(result.value) };
  }

  @Public()
  @Post('/invitations/accept')
  @HttpCode(204)
  @Header('Cache-Control', 'no-store')
  async acceptInvite(
    @Body(new ZodValidationPipe(acceptSchema))
    body: z.infer<typeof acceptSchema>,
  ) {
    const result = await this.accept.execute(body);
    if (result.isLeft()) {
      if (result.value instanceof InvalidPasswordError)
        throw new BadRequestException(
          'A senha deve ter pelo menos 8 caracteres, letra maiúscula, minúscula e número, e no máximo 72 bytes.',
        );
      if (result.value instanceof InvalidInvitationError)
        throw new BadRequestException(
          'Convite inválido, expirado ou já utilizado.',
        );
      throw result.value;
    }
  }
}
