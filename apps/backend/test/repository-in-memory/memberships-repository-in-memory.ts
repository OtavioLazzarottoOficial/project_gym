import { left, right } from '../../src/core/either.ts';
import { MembershipsRepository } from '../../src/domain/organizations/application/repositories/memberships-repository.ts';
import { MembershipAlreadyExistsError } from '../../src/domain/organizations/application/errors/membership-already-exists-error.ts';
import { Membership } from '../../src/domain/organizations/enterprise/membership.ts';
import type { User } from '../../src/domain/accounts/enterprise/user.ts';
import { UsersRepositoryInMemory } from './users-repository-in-memory.ts';

export class MembershipsRepositoryInMemory extends MembershipsRepository {
  items: Membership[] = [];
  constructor(private readonly users: UsersRepositoryInMemory) {
    super();
  }
  async findByUserAndOrganization(userId: string, organizationId: string) {
    return (
      this.items.find(
        (item) =>
          item.user_id.toString() === userId &&
          item.organization_id.toString() === organizationId,
      ) ?? null
    );
  }
  async findByUserId(userId: string) {
    return this.items.filter((item) => item.user_id.toString() === userId);
  }
  async register(
    candidate: User,
    membership: Membership,
  ): ReturnType<MembershipsRepository['register']> {
    const user =
      this.users.items.find((item) => item.email.equals(candidate.email)) ??
      candidate;
    if (
      this.items.some(
        (item) =>
          item.user_id.equals(user.id) &&
          item.organization_id.equals(membership.organization_id),
      )
    ) {
      return left(new MembershipAlreadyExistsError());
    }
    const actual = Membership.create(
      {
        organization_id: membership.organization_id,
        user_id: user.id,
        role: membership.role,
        created_at: membership.created_at,
      },
      membership.id,
    );
    if (actual.isLeft()) {
      throw actual.value;
    }
    if (!this.users.items.some((item) => item.id.equals(user.id))) {
      this.users.items.push(user);
    }
    this.items.push(actual.value);
    return right({ user, membership: actual.value });
  }
}
