import { describe, expect, it } from 'vitest';
import { Organization } from './organization.ts';
import { Branch } from './branch.ts';
import { Membership } from './membership.ts';
import { UserRole } from '../../accounts/enterprise/enums/user-role.ts';
import { UniqueEntityID } from '../../../core/entities/unique-entity-id.ts';
import { makeOrganization } from '../../../../test/factories/make-organization.ts';
import { makeBranch } from '../../../../test/factories/make-branch.ts';
import { makeMembership } from '../../../../test/factories/make-membership.ts';

describe('Organizations, branches and memberships', () => {
  it('supports factory overrides and identity reconstitution', () => {
    const id = new UniqueEntityID('network');
    const network = makeOrganization({ name: 'Rede Exemplo' }, id);
    const branch = makeBranch({
      organization_id: id,
      name: 'Centro',
      city: 'Tubarão',
    });
    expect(network.id).toBe(id);
    expect(network.name.value).toBe('Rede Exemplo');
    expect(branch.organization_id).toBe(id);
    expect(branch.city.value).toBe('Tubarão');
  });

  it.each(['', ' ', 'a'.repeat(121)])(
    'rejects an invalid organization name',
    (name) => {
      expect(Organization.create({ name }).isLeft()).toBe(true);
    },
  );

  it.each(['', ' ', 'a'.repeat(121)])(
    'rejects an invalid branch city',
    (city) => {
      expect(
        Branch.create({
          organization_id: new UniqueEntityID(),
          name: 'Centro',
          city,
        }).isLeft(),
      ).toBe(true);
    },
  );

  it.each(Object.values(UserRole))(
    'stores one role %s for one identity in one network',
    (role) => {
      const membership = makeMembership({ role });
      expect(membership.role).toBe(role);
      expect(membership.user_id.toString()).not.toBe('');
    },
  );

  it('rejects a membership without an owner or with an unknown role', () => {
    const organization_id = new UniqueEntityID();
    expect(
      Membership.create({
        organization_id,
        user_id: new UniqueEntityID(''),
        role: UserRole.ADMIN,
      }).isLeft(),
    ).toBe(true);
    expect(
      Membership.create({
        organization_id,
        user_id: new UniqueEntityID(),
        role: 'platform_admin' as UserRole,
      }).isLeft(),
    ).toBe(true);
  });

  it('does not expose mutable timestamps', () => {
    const date = new Date('2026-11-04T14:00:00Z');
    const network = makeOrganization({ created_at: date });
    date.setFullYear(2000);
    network.created_at.setFullYear(2000);
    expect(network.created_at.getUTCFullYear()).toBe(2026);
  });
});
