import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { z } from 'zod';
import { RegisterStudentUseCase } from '../../../domain/students/application/usecases/register-student-usecase.ts';
import { InvalidStudentBranchError } from '../../../domain/students/application/errors/invalid-student-branch-error.ts';
import { StudentAlreadyExistsError } from '../../../domain/students/application/errors/student-already-exists-error.ts';
import { StudentIdentityConflictError } from '../../../domain/students/application/errors/student-identity-conflict-error.ts';
import { InvalidStudentError } from '../../../domain/students/enterprise/errors/invalid-student-error.ts';
import { InvalidCpfError } from '../../../domain/students/enterprise/errors/invalid-cpf-error.ts';
import { InvalidPhoneError } from '../../../domain/students/enterprise/errors/invalid-phone-error.ts';
import { InvalidNameError } from '../../../domain/accounts/enterprise/errors/invalid-name-error.ts';
import { InvalidEmailError } from '../../../domain/accounts/enterprise/errors/invalid-email-error.ts';
import { InvalidPlatformAccessError } from '../../../domain/accounts/enterprise/errors/invalid-platform-access-error.ts';
import { NotAllowedError } from '../../../domain/accounts/application/errors/not-allowed-error.ts';
import { OrganizationNotFoundError } from '../../../domain/organizations/application/errors/organization-not-found-error.ts';
import { IssueInvitationUseCase } from '../../../domain/accounts/application/usecases/issue-invitation-usecase.ts';
import { CurrentUser } from '../../auth/current-user-decorator.ts';
import type { UserPayload } from '../../auth/jwt.strategy.ts';
import { ZodValidationPipe } from '../pipes/zod-validation-pipe.ts';
import { UserPresenter } from '../presenters/user-presenter.ts';
import { StudentPresenter } from '../presenters/student-presenter.ts';
import { InvitationPresenter } from '../presenters/invitation-presenter.ts';

const text = z.string();
const contact = z.strictObject({ name: text, phone: text, relationship: text });
const address = z.strictObject({
  postalCode: text,
  street: text,
  number: text,
  neighborhood: text,
  city: text,
  state: text,
  complement: text.optional(),
});
export const registerStudentBodySchema = z.strictObject({
  branchId: z.uuid(),
  name: text,
  email: text,
  cpf: text,
  phone: text,
  birthDate: text,
  address: address.nullable().optional(),
  emergencyContact: contact.nullable().optional(),
  guardian: contact.nullable().optional(),
});

@Controller('/organizations/:organizationId/students')
export class RegisterStudentController {
  constructor(
    private readonly register: RegisterStudentUseCase,
    private readonly issue: IssueInvitationUseCase,
    private readonly invitationPresenter: InvitationPresenter,
  ) {}

  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async handle(
    @CurrentUser() current: UserPayload,
    @Param('organizationId', new ZodValidationPipe(z.uuid()))
    organizationId: string,
    @Body(new ZodValidationPipe(registerStudentBodySchema))
    body: z.infer<typeof registerStudentBodySchema>,
  ) {
    const result = await this.register.execute({
      requestedBy: current.sub,
      organizationId,
      ...body,
    });
    if (result.isLeft()) {
      const error = result.value;

      if (error instanceof NotAllowedError) {
        throw new ForbiddenException(
          'Somente administrador da rede pode cadastrar alunos.',
        );
      }
      if (
        error instanceof OrganizationNotFoundError ||
        error instanceof InvalidStudentBranchError
      ) {
        throw new NotFoundException('Rede ou unidade não encontrada.');
      }
      if (
        error instanceof StudentAlreadyExistsError ||
        error instanceof StudentIdentityConflictError
      ) {
        throw new ConflictException(
          'Não foi possível vincular os dados informados nesta rede.',
        );
      }
      if (
        error instanceof InvalidStudentError ||
        error instanceof InvalidCpfError ||
        error instanceof InvalidPhoneError ||
        error instanceof InvalidNameError ||
        error instanceof InvalidEmailError ||
        error instanceof InvalidPlatformAccessError
      ) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    // A self-demoting network administrator already has an active password; do not re-authorize an unnecessary invitation.
    if (!result.value.user.isAwaitingPassword) {
      return {
        user: UserPresenter.toHTTP(result.value.user),
        student: StudentPresenter.toHTTP(result.value.student),
        invitation: { status: 'already_active' },
      };
    }

    const invitation = await this.issue.execute({
      requestedBy: current.sub,
      organizationId,
      userId: result.value.user.id.toString(),
    });

    return {
      user: UserPresenter.toHTTP(result.value.user),
      student: StudentPresenter.toHTTP(result.value.student),
      invitation: invitation.isRight()
        ? this.invitationPresenter.toHTTP(invitation.value)
        : { status: 'delivery_failed' },
    };
  }
}
