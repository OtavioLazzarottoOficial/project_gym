import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import { User, type InvalidUserError } from '../../enterprise/user.ts';
import { UserRole } from '../../enterprise/enums/user-role.ts';
import { UsersRepository } from '../repositories/users-repository.ts';
import { NotAllowedError } from '../errors/not-allowed-error.ts';
import { Membership } from '../../../organizations/enterprise/membership.ts';
import type { InvalidOrganizationError } from '../../../organizations/enterprise/errors/invalid-organization-error.ts';
import type { MembershipAlreadyExistsError } from '../../../organizations/application/errors/membership-already-exists-error.ts';
import type { OrganizationNotFoundError } from '../../../organizations/application/errors/organization-not-found-error.ts';
import { MembershipsRepository } from '../../../organizations/application/repositories/memberships-repository.ts';
import { OrganizationAccess } from '../../../organizations/application/services/organization-access.ts';

export interface CreateUserUseCaseRequest {
  requestedBy: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
}
export type CreateUserUseCaseResponse = Either<
  | NotAllowedError
  | InvalidUserError
  | InvalidOrganizationError
  | OrganizationNotFoundError
  | MembershipAlreadyExistsError,
  { user: User; membership: Membership }
>;

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly access: OrganizationAccess,
    private readonly memberships: MembershipsRepository,
  ) {}

  async execute(
    request: CreateUserUseCaseRequest,
  ): Promise<CreateUserUseCaseResponse> {
    const access = await this.access.resolve(
      request.requestedBy,
      request.organizationId,
      true,
    );

    if (access.isLeft()) {
      return left(access.value);
    }

    // Platform administration may provision network administrators, not silently impersonate one.
    if (
      access.value.membership?.role !== UserRole.ADMIN &&
      request.role !== UserRole.ADMIN
    ) {
      return left(new NotAllowedError());
    }

    const candidate = User.create({ name: request.name, email: request.email });

    if (candidate.isLeft()) {
      return left(candidate.value);
    }

    const existing = await this.usersRepository.findByEmail(
      candidate.value.email.value,
    );
    const user = existing ?? candidate.value;
    const membership = Membership.create({
      organization_id: access.value.organization.id,
      user_id: user.id,
      role: request.role,
    });

    if (membership.isLeft()) {
      return left(membership.value);
    }

    const registered = await this.memberships.register(user, membership.value);

    if (registered.isLeft()) {
      return left(registered.value);
    }

    return right(registered.value);
  }
}
