import { Injectable } from '@nestjs/common';
import { left, right, type Either } from '../../../../core/either.ts';
import { UserRole } from '../../enterprise/enums/user-role.ts';
import { NotAllowedError } from '../errors/not-allowed-error.ts';
import { InvalidInvitationError } from '../errors/invalid-invitation-error.ts';
import { UsersRepository } from '../repositories/users-repository.ts';
import { InvitationsRepository } from '../repositories/invitations-repository.ts';
import { InvitationTokens } from '../cryptography/invitation-tokens.ts';
import { InvitationDelivery } from '../messaging/invitation-delivery.ts';
import { OrganizationAccess } from '../../../organizations/application/services/organization-access.ts';
import { MembershipsRepository } from '../../../organizations/application/repositories/memberships-repository.ts';
import type { OrganizationNotFoundError } from '../../../organizations/application/errors/organization-not-found-error.ts';

export type InvitationResult =
  | { status: 'already_active' | 'sent' | 'delivery_failed' }
  | { status: 'manual'; token: string };

@Injectable()
export class IssueInvitationUseCase {
  constructor(
    private readonly access: OrganizationAccess,
    private readonly users: UsersRepository,
    private readonly memberships: MembershipsRepository,
    private readonly invitations: InvitationsRepository,
    private readonly tokens: InvitationTokens,
    private readonly delivery: InvitationDelivery,
  ) {}

  async execute(input: {
    requestedBy: string;
    organizationId: string;
    userId: string;
  }): Promise<
    Either<
      NotAllowedError | OrganizationNotFoundError | InvalidInvitationError,
      InvitationResult
    >
  > {
    const access = await this.access.resolve(
      input.requestedBy,
      input.organizationId,
      true,
    );
    if (access.isLeft()) return left(access.value);

    const membership = await this.memberships.findByUserAndOrganization(
      input.userId,
      input.organizationId,
    );
    const user = await this.users.findById(input.userId);
    if (!membership || !user) return left(new InvalidInvitationError());

    if (
      access.value.membership?.role !== UserRole.ADMIN &&
      membership.role !== UserRole.ADMIN
    )
      return left(new NotAllowedError());
    if (!user.isAwaitingPassword) return right({ status: 'already_active' });

    const token = this.tokens.generate();
    const issued = await this.invitations.issue({
      membershipId: membership.id.toString(),
      userId: input.userId,
      tokenHash: this.tokens.hash(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    if (!issued) return right({ status: 'already_active' });
    if (membership.role === UserRole.ADMIN)
      return right({ status: 'manual', token });

    const sent = await this.delivery.send({
      email: user.email.value,
      name: user.name.value,
      token,
    });
    return right({ status: sent ? 'sent' : 'delivery_failed' });
  }
}
