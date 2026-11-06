import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import type { InvalidNameError } from '../../../accounts/enterprise/errors/invalid-name-error.ts';
import type { NotAllowedError } from '../../../accounts/application/errors/not-allowed-error.ts';
import { Branch } from '../../enterprise/branch.ts';
import type { InvalidOrganizationError } from '../../enterprise/errors/invalid-organization-error.ts';
import type { OrganizationNotFoundError } from '../errors/organization-not-found-error.ts';
import { OrganizationAccess } from '../services/organization-access.ts';
import { BranchesRepository } from '../repositories/branches-repository.ts';

@Injectable()
export class CreateBranchUseCase {
  constructor(
    private readonly access: OrganizationAccess,
    private readonly branches: BranchesRepository,
  ) {}

  async execute(request: {
    requestedBy: string;
    organizationId: string;
    name: string;
    city: string;
  }): Promise<
    Either<
      | NotAllowedError
      | OrganizationNotFoundError
      | InvalidOrganizationError
      | InvalidNameError,
      { branch: Branch }
    >
  > {
    const access = await this.access.resolve(
      request.requestedBy,
      request.organizationId,
      true,
    );

    if (access.isLeft()) {
      return left(access.value);
    }

    const branch = Branch.create({
      organization_id: access.value.organization.id,
      name: request.name,
      city: request.city,
    });

    if (branch.isLeft()) {
      return left(branch.value);
    }

    await this.branches.create(branch.value);

    return right({ branch: branch.value });
  }
}
