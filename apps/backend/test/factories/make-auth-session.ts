import { faker } from '@faker-js/faker';
import { UniqueEntityID } from '../../src/core/entities/unique-entity-id.ts';
import {
  AuthSession,
  type CreateAuthSessionProps,
} from '../../src/domain/auth/enterprise/auth-session.ts';

export function makeAuthSession(
  overrides: Partial<CreateAuthSessionProps> = {},
  id?: UniqueEntityID,
) {
  const result = AuthSession.create(
    {
      user_id: new UniqueEntityID(faker.string.uuid()),
      created_at: faker.date.recent(),
      ...overrides,
    },
    id,
  );

  if (result.isLeft()) {
    throw result.value;
  }

  return result.value;
}
