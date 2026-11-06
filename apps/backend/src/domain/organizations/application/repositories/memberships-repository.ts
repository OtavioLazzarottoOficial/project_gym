import { Injectable } from '@nestjs/common';
import type { Either } from '../../../../core/either.ts';
import type { User } from '../../../accounts/enterprise/user.ts';
import type { Membership } from '../../enterprise/membership.ts';
import type { MembershipAlreadyExistsError } from '../errors/membership-already-exists-error.ts';

@Injectable()
export abstract class MembershipsRepository {
  abstract findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<Membership | null>;

  abstract findByUserId(userId: string): Promise<Membership[]>;

  // Atomically reuse the identity by normalized email and create the network membership.
  // Never change the password, name, platform access or role of an existing membership.
  abstract register(
    user: User,
    membership: Membership,
  ): Promise<
    Either<MembershipAlreadyExistsError, { user: User; membership: Membership }>
  >;
}
