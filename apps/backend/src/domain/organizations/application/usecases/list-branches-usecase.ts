import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import type { NotAllowedError } from '../../../accounts/application/errors/not-allowed-error.ts';
import type { Branch } from '../../enterprise/branch.ts';
import type { OrganizationNotFoundError } from '../errors/organization-not-found-error.ts';
import { OrganizationAccess } from '../services/organization-access.ts';
import { BranchesRepository } from '../repositories/branches-repository.ts';

@Injectable()
export class ListBranchesUseCase {
  constructor(
    private readonly access: OrganizationAccess,
    private readonly branches: BranchesRepository,
  ) {}

  async execute(request: {
    requestedBy: string;
    organizationId: string;
  }): Promise<
    Either<NotAllowedError | OrganizationNotFoundError, { branches: Branch[] }>
  > {
    const access = await this.access.resolve(
      request.requestedBy,
      request.organizationId,
    );

    if (access.isLeft()) {
      return left(access.value);
    }

    return right({
      branches: await this.branches.findByOrganizationId(
        request.organizationId,
      ),
    });
  }
}
