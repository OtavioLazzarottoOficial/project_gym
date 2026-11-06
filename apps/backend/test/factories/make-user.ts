import { faker } from '@faker-js/faker';
import type { UniqueEntityID } from '../../src/core/entities/unique-entity-id.ts';
import {
  User,
  type CreateUserProps,
} from '../../src/domain/accounts/enterprise/user.ts';

export function makeUser(
  overrides: Partial<CreateUserProps> = {},
  id?: UniqueEntityID,
) {
  const result = User.create(
    {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      ...overrides,
    },
    id,
  );

  if (result.isLeft()) {
    throw result.value;
  }

  return result.value;
}
