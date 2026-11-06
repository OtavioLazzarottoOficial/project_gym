import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import { UsersRepository } from '../../../accounts/application/repositories/users-repository.ts';
import { NotAllowedError } from '../../../accounts/application/errors/not-allowed-error.ts';
import { UserRole } from '../../../accounts/enterprise/enums/user-role.ts';
import type { User } from '../../../accounts/enterprise/user.ts';
import type { Organization } from '../../enterprise/organization.ts';
import type { Membership } from '../../enterprise/membership.ts';
import { OrganizationsRepository } from '../repositories/organizations-repository.ts';
import { MembershipsRepository } from '../repositories/memberships-repository.ts';
import { OrganizationNotFoundError } from '../errors/organization-not-found-error.ts';

@Injectable()
export class OrganizationAccess {
  constructor(
    private readonly users: UsersRepository,
    private readonly organizations: OrganizationsRepository,
    private readonly memberships: MembershipsRepository,
  ) {}

  async resolve(
    userId: string,
    organizationId: string,
    manage = false,
  ): Promise<
    Either<
      NotAllowedError | OrganizationNotFoundError,
      { user: User; organization: Organization; membership: Membership | null }
    >
  > {
    const user = await this.users.findById(userId);

    if (!user || user.isAwaitingPassword) {
      return left(new NotAllowedError());
    }

    const membership = await this.memberships.findByUserAndOrganization(
      userId,
      organizationId,
    );

    if (
      !user.is_platform_admin &&
      (!membership || (manage && membership.role !== UserRole.ADMIN))
    ) {
      return left(new NotAllowedError());
    }

    const organization = await this.organizations.findById(organizationId);

    if (!organization) {
      return left(new OrganizationNotFoundError());
    }

    return right({ user, organization, membership });
  }
}
