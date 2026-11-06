import { faker } from '@faker-js/faker';
import { UniqueEntityID } from '../../src/core/entities/unique-entity-id.ts';
import {
  Student,
  type StudentInput,
} from '../../src/domain/students/enterprise/student.ts';

function fakeCpf(): string {
  const digits = Array.from({ length: 9 }, () =>
    faker.number.int({ min: 0, max: 9 }),
  );
  for (const length of [9, 10]) {
    const sum = digits
      .slice(0, length)
      .reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    digits.push(remainder === 10 ? 0 : remainder);
  }
  return digits.join('');
}

export function makeStudent(
  overrides: Partial<StudentInput> = {},
  id?: UniqueEntityID,
) {
  const result = Student.create(
    {
      organizationId: new UniqueEntityID(faker.string.uuid()),
      branchId: new UniqueEntityID(faker.string.uuid()),
      userId: new UniqueEntityID(faker.string.uuid()),
      cpf: fakeCpf(),
      phone: `49${faker.string.numeric(9)}`,
      birthDate: faker.date
        .between({ from: '1940-01-01', to: '2005-01-01' })
        .toISOString()
        .slice(0, 10),
      ...overrides,
    },
    '2026-11-05',
    id,
  );
  if (result.isLeft()) throw result.value;
  return result.value;
}
