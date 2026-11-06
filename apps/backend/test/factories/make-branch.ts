import { faker } from '@faker-js/faker';
import { UniqueEntityID } from '../../src/core/entities/unique-entity-id.ts';
import { Branch } from '../../src/domain/organizations/enterprise/branch.ts';

export function makeBranch(
  overrides: Partial<{
    organization_id: UniqueEntityID;
    name: string;
    city: string;
    created_at: Date;
  }> = {},
  id?: UniqueEntityID,
) {
  const result = Branch.create(
    {
      organization_id: new UniqueEntityID(faker.string.uuid()),
      name: faker.company.name(),
      city: faker.location.city(),
      ...overrides,
    },
    id,
  );
  if (result.isLeft()) {
    throw result.value;
  }
  return result.value;
}
