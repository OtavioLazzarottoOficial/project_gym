import { Injectable } from '@nestjs/common';
import { left, type Either } from '../../../../core/either.ts';
import type { NotAllowedError } from '../errors/not-allowed-error.ts';
import type { OrganizationNotFoundError } from '../../../organizations/application/errors/organization-not-found-error.ts';
import type { InvitationResult } from './issue-invitation-usecase.ts';
import { InvalidInvitationError } from '../errors/invalid-invitation-error.ts';
import { UsersRepository } from '../repositories/users-repository.ts';
import { OrganizationAccess } from '../../../organizations/application/services/organization-access.ts';
import { IssueInvitationUseCase } from './issue-invitation-usecase.ts';

@Injectable()
export class ReissueInvitationByEmailUseCase {
  constructor(
    private readonly access: OrganizationAccess,
    private readonly users: UsersRepository,
    private readonly issue: IssueInvitationUseCase,
  ) {}

  async execute(input: {
    requestedBy: string;
    organizationId: string;
    email: string;
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
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());
    if (!user) return left(new InvalidInvitationError());
    return this.issue.execute({
      requestedBy: input.requestedBy,
      organizationId: input.organizationId,
      userId: user.id.toString(),
    });
  }
}
