import { IssueInvitationUseCase } from '../../../domain/accounts/application/usecases/issue-invitation-usecase.ts';
import { InvitationPresenter } from '../presenters/invitation-presenter.ts';
import { Header } from '@nestjs/common';
import { OrganizationPresenter } from '../presenters/organization-presenter.ts';
import { MembershipAlreadyExistsError } from '../../../domain/organizations/application/errors/membership-already-exists-error.ts';
import { OrganizationNotFoundError } from '../../../domain/organizations/application/errors/organization-not-found-error.ts';
import { InvalidOrganizationError } from '../../../domain/organizations/enterprise/errors/invalid-organization-error.ts';
import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { CreateUserUseCase } from '../../../domain/accounts/application/usecases/create-user-usecase.ts';
import { NotAllowedError } from '../../../domain/accounts/application/errors/not-allowed-error.ts';
import { UserAlreadyExistsError } from '../../../domain/accounts/application/errors/user-already-exists-error.ts';
import { UserRole } from '../../../domain/accounts/enterprise/enums/user-role.ts';
import { InvalidNameError } from '../../../domain/accounts/enterprise/errors/invalid-name-error.ts';
import { InvalidEmailError } from '../../../domain/accounts/enterprise/errors/invalid-email-error.ts';
import { InvalidUserRoleError } from '../../../domain/accounts/enterprise/errors/invalid-user-role-error.ts';
import { CurrentUser } from '../../auth/current-user-decorator.ts';
import type { UserPayload } from '../../auth/jwt.strategy.ts';
import { ZodValidationPipe } from '../pipes/zod-validation-pipe.ts';
import { UserPresenter } from '../presenters/user-presenter.ts';

export const createUserBodySchema = z.strictObject({
  name: z
    .string()
    .refine(
      (name) => name.trim().length > 0 && Array.from(name).length <= 120,
      {
        message: 'Informe um nome preenchido com até 120 caracteres.',
      },
    ),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  role: z.enum(UserRole),
});

type CreateUserBody = z.infer<typeof createUserBodySchema>;

@Controller('/organizations/:organizationId/users')
export class CreateUserController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly issueInvitation: IssueInvitationUseCase,
    private readonly invitationPresenter: InvitationPresenter,
  ) {}

  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async handle(
    @Body(new ZodValidationPipe(createUserBodySchema)) body: CreateUserBody,
    @CurrentUser() currentUser: UserPayload,
    @Param('organizationId', new ZodValidationPipe(z.uuid()))
    organizationId: string,
  ) {
    const result = await this.createUser.execute({
      requestedBy: currentUser.sub,
      organizationId,
      name: body.name,
      email: body.email,
      role: body.role,
    });

    if (result.isLeft()) {
      const error = result.value;

      if (error instanceof NotAllowedError) {
        throw new ForbiddenException(
          'Somente um administrador pode cadastrar contas.',
        );
      }

      if (
        error instanceof UserAlreadyExistsError ||
        error instanceof MembershipAlreadyExistsError
      ) {
        throw new ConflictException(
          'Esta conta já está vinculada a esta rede.',
        );
      }

      if (
        error instanceof InvalidNameError ||
        error instanceof InvalidEmailError ||
        error instanceof InvalidUserRoleError ||
        error instanceof InvalidOrganizationError
      ) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof OrganizationNotFoundError) {
        throw new NotFoundException('Rede não encontrada.');
      }

      throw error;
    }

    const invitation = await this.issueInvitation.execute({
      requestedBy: currentUser.sub,
      organizationId,
      userId: result.value.user.id.toString(),
    });
    if (invitation.isLeft()) throw invitation.value;

    return {
      invitation: this.invitationPresenter.toHTTP(invitation.value),
      user: UserPresenter.toHTTP(result.value.user),
      membership: OrganizationPresenter.membershipToHTTP(
        result.value.membership,
      ),
    };
  }
}
