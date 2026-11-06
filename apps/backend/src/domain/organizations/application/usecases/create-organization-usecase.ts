import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import { UsersRepository } from '../../../accounts/application/repositories/users-repository.ts';
import { NotAllowedError } from '../../../accounts/application/errors/not-allowed-error.ts';
import type { InvalidNameError } from '../../../accounts/enterprise/errors/invalid-name-error.ts';
import { Organization } from '../../enterprise/organization.ts';
import { OrganizationsRepository } from '../repositories/organizations-repository.ts';

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly organizations: OrganizationsRepository,
  ) {}

  async execute(request: {
    requestedBy: string;
    name: string;
  }): Promise<
    Either<NotAllowedError | InvalidNameError, { organization: Organization }>
  > {
    const actor = await this.users.findById(request.requestedBy);

    if (!actor?.is_platform_admin || actor.isAwaitingPassword) {
      return left(new NotAllowedError());
    }

    const organization = Organization.create({ name: request.name });

    if (organization.isLeft()) {
      return left(organization.value);
    }

    await this.organizations.create(organization.value);

    return right({ organization: organization.value });
  }
}
