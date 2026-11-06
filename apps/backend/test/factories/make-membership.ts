import { faker } from '@faker-js/faker';
import { UniqueEntityID } from '../../src/core/entities/unique-entity-id.ts';
import {
  Membership,
  type MembershipProps,
} from '../../src/domain/organizations/enterprise/membership.ts';
import { UserRole } from '../../src/domain/accounts/enterprise/enums/user-role.ts';

export function makeMembership(
  overrides: Partial<MembershipProps> = {},
  id?: UniqueEntityID,
) {
  const result = Membership.create(
    {
      organization_id: new UniqueEntityID(faker.string.uuid()),
      user_id: new UniqueEntityID(faker.string.uuid()),
      role: faker.helpers.arrayElement(Object.values(UserRole)),
      ...overrides,
    },
    id,
  );
  if (result.isLeft()) {
    throw result.value;
  }
  return result.value;
}
