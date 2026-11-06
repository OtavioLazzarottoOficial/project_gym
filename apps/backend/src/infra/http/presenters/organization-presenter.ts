import type { Organization } from '../../../domain/organizations/enterprise/organization.ts';
import type { Branch } from '../../../domain/organizations/enterprise/branch.ts';
import type { Membership } from '../../../domain/organizations/enterprise/membership.ts';

export class OrganizationPresenter {
  static toHTTP(this: void, organization: Organization) {
    return {
      id: organization.id.toString(),
      name: organization.name.value,
      created_at: organization.created_at.toISOString(),
    };
  }

  static branchToHTTP(this: void, branch: Branch) {
    return {
      id: branch.id.toString(),
      organization_id: branch.organization_id.toString(),
      name: branch.name.value,
      city: branch.city.value,
      created_at: branch.created_at.toISOString(),
    };
  }

  static membershipToHTTP(this: void, membership: Membership) {
    return {
      id: membership.id.toString(),
      organization_id: membership.organization_id.toString(),
      user_id: membership.user_id.toString(),
      role: membership.role,
    };
  }
}
