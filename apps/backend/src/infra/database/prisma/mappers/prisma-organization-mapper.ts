import { UniqueEntityID } from '../../../../core/entities/unique-entity-id.ts';
import { Organization } from '../../../../domain/organizations/enterprise/organization.ts';
import { Branch } from '../../../../domain/organizations/enterprise/branch.ts';
import { Membership } from '../../../../domain/organizations/enterprise/membership.ts';
import { UserRole } from '../../../../domain/accounts/enterprise/enums/user-role.ts';
import type {
  Organization as RawOrganization,
  Branch as RawBranch,
  Membership as RawMembership,
} from '../generated/client.ts';
import { InvalidPersistedOrganizationError } from '../../../errors/invalid-persisted-organization-error.ts';

export class PrismaOrganizationMapper {
  static toDomain(this: void, raw: RawOrganization): Organization {
    const result = Organization.create(
      { name: raw.name, created_at: raw.created_at },
      new UniqueEntityID(raw.id),
    );

    if (
      result.isLeft() ||
      !raw.id ||
      !Number.isFinite(raw.created_at.getTime())
    ) {
      throw new InvalidPersistedOrganizationError();
    }

    return result.value;
  }

  static branchToDomain(this: void, raw: RawBranch): Branch {
    const result = Branch.create(
      {
        organization_id: new UniqueEntityID(raw.organization_id),
        name: raw.name,
        city: raw.city,
        created_at: raw.created_at,
      },
      new UniqueEntityID(raw.id),
    );

    if (
      result.isLeft() ||
      !raw.id ||
      !Number.isFinite(raw.created_at.getTime())
    ) {
      throw new InvalidPersistedOrganizationError();
    }

    return result.value;
  }

  static membershipToDomain(this: void, raw: RawMembership): Membership {
    const result = Membership.create(
      {
        organization_id: new UniqueEntityID(raw.organization_id),
        user_id: new UniqueEntityID(raw.user_id),
        role: raw.role as UserRole,
        created_at: raw.created_at,
      },
      new UniqueEntityID(raw.id),
    );

    if (
      result.isLeft() ||
      !raw.id ||
      !Number.isFinite(raw.created_at.getTime())
    ) {
      throw new InvalidPersistedOrganizationError();
    }

    return result.value;
  }
}
