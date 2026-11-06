import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import { UsersRepository } from '../../../accounts/application/repositories/users-repository.ts';
import { NotAllowedError } from '../../../accounts/application/errors/not-allowed-error.ts';
import type { UserRole } from '../../../accounts/enterprise/enums/user-role.ts';
import type { Organization } from '../../enterprise/organization.ts';
import { OrganizationsRepository } from '../repositories/organizations-repository.ts';
import { MembershipsRepository } from '../repositories/memberships-repository.ts';

@Injectable()
export class ListOrganizationsUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly organizations: OrganizationsRepository,
    private readonly memberships: MembershipsRepository,
  ) {}

  async execute(request: {
    requestedBy: string;
  }): Promise<
    Either<
      NotAllowedError,
      { organizations: { organization: Organization; role: UserRole | null }[] }
    >
  > {
    const actor = await this.users.findById(request.requestedBy);

    if (!actor || actor.isAwaitingPassword) {
      return left(new NotAllowedError());
    }

    const memberships = await this.memberships.findByUserId(
      actor.id.toString(),
    );
    const roles = new Map(
      memberships.map((membership) => [
        membership.organization_id.toString(),
        membership.role,
      ]),
    );
    const organizations = actor.is_platform_admin
      ? await this.organizations.findAll()
      : await Promise.all(
          memberships.map((membership) =>
            this.organizations.findById(membership.organization_id.toString()),
          ),
        );

    return right({
      organizations: organizations
        .filter(
          (organization): organization is Organization => organization !== null,
        )
        .map((organization) => ({
          organization,
          role: roles.get(organization.id.toString()) ?? null,
        })),
    });
  }
}
