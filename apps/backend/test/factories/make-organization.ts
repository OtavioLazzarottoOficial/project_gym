import { faker } from '@faker-js/faker';
import type { UniqueEntityID } from '../../src/core/entities/unique-entity-id.ts';
import { Organization } from '../../src/domain/organizations/enterprise/organization.ts';

export function makeOrganization(
  overrides: { name?: string; created_at?: Date } = {},
  id?: UniqueEntityID,
) {
  const result = Organization.create(
    { name: faker.company.name(), ...overrides },
    id,
  );
  if (result.isLeft()) {
    throw result.value;
  }
  return result.value;
}
