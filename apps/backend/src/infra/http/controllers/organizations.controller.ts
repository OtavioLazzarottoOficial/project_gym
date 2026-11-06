import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser } from '../../auth/current-user-decorator.ts';
import type { UserPayload } from '../../auth/jwt.strategy.ts';
import { ZodValidationPipe } from '../pipes/zod-validation-pipe.ts';
import { OrganizationPresenter } from '../presenters/organization-presenter.ts';
import { CreateOrganizationUseCase } from '../../../domain/organizations/application/usecases/create-organization-usecase.ts';
import { ListOrganizationsUseCase } from '../../../domain/organizations/application/usecases/list-organizations-usecase.ts';
import { CreateBranchUseCase } from '../../../domain/organizations/application/usecases/create-branch-usecase.ts';
import { ListBranchesUseCase } from '../../../domain/organizations/application/usecases/list-branches-usecase.ts';
import { NotAllowedError } from '../../../domain/accounts/application/errors/not-allowed-error.ts';
import { OrganizationNotFoundError } from '../../../domain/organizations/application/errors/organization-not-found-error.ts';
import { InvalidOrganizationError } from '../../../domain/organizations/enterprise/errors/invalid-organization-error.ts';
import { InvalidNameError } from '../../../domain/accounts/enterprise/errors/invalid-name-error.ts';

const name = z
  .string()
  .refine(
    (value) => value.trim().length > 0 && Array.from(value).length <= 120,
  );
const organizationBody = z.strictObject({ name });
const branchBody = z.strictObject({ name, city: name });

function handleError(error: Error): never {
  if (error instanceof NotAllowedError) {
    throw new ForbiddenException(
      'Você não tem acesso a esta operação nesta rede.',
    );
  }
  if (error instanceof OrganizationNotFoundError) {
    throw new NotFoundException('Rede não encontrada.');
  }
  if (
    error instanceof InvalidNameError ||
    error instanceof InvalidOrganizationError
  ) {
    throw new BadRequestException('Confira os dados da rede ou unidade.');
  }
  throw error;
}

@Controller('/organizations')
export class OrganizationsController {
  constructor(
    private readonly createOrganization: CreateOrganizationUseCase,
    private readonly listOrganizations: ListOrganizationsUseCase,
    private readonly createBranch: CreateBranchUseCase,
    private readonly listBranches: ListBranchesUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() current: UserPayload) {
    const result = await this.listOrganizations.execute({
      requestedBy: current.sub,
    });

    if (result.isLeft()) {
      handleError(result.value);
    }

    return {
      organizations: result.value.organizations.map(
        ({ organization, role }) => ({
          ...OrganizationPresenter.toHTTP(organization),
          role,
        }),
      ),
    };
  }

  @Post()
  async create(
    @CurrentUser() current: UserPayload,
    @Body(new ZodValidationPipe(organizationBody))
    body: z.infer<typeof organizationBody>,
  ) {
    const result = await this.createOrganization.execute({
      requestedBy: current.sub,
      ...body,
    });

    if (result.isLeft()) {
      handleError(result.value);
    }

    return {
      organization: OrganizationPresenter.toHTTP(result.value.organization),
    };
  }

  @Get(':organizationId/branches')
  async branches(
    @CurrentUser() current: UserPayload,
    @Param('organizationId', new ZodValidationPipe(z.uuid()))
    organizationId: string,
  ) {
    const result = await this.listBranches.execute({
      requestedBy: current.sub,
      organizationId,
    });

    if (result.isLeft()) {
      handleError(result.value);
    }

    return {
      branches: result.value.branches.map(OrganizationPresenter.branchToHTTP),
    };
  }

  @Post(':organizationId/branches')
  async branch(
    @CurrentUser() current: UserPayload,
    @Param('organizationId', new ZodValidationPipe(z.uuid()))
    organizationId: string,
    @Body(new ZodValidationPipe(branchBody)) body: z.infer<typeof branchBody>,
  ) {
    const result = await this.createBranch.execute({
      requestedBy: current.sub,
      organizationId,
      ...body,
    });

    if (result.isLeft()) {
      handleError(result.value);
    }

    return { branch: OrganizationPresenter.branchToHTTP(result.value.branch) };
  }
}
