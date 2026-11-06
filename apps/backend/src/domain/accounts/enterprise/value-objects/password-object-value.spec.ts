import { describe, expect, it } from 'vitest';
import { PasswordObjectValue } from './password-object-value.ts';
import { InvalidPasswordError } from '../errors/invalid-password-error.ts';

describe('PasswordObjectValue', () => {
  it.each(['Abcdefg1', 'Ab1' + 'a'.repeat(69), 'Ab1' + 'é'.repeat(34) + 'a'])(
    'accepts the configured length and complexity boundaries',
    (password) => {
      expect(PasswordObjectValue.create(password).isRight()).toBe(true);
    },
  );

  it.each([
    '',
    'Abcde1',
    'abcdefg1',
    'ABCDEFG1',
    'Abcdefgh',
    'Ab1' + 'a'.repeat(70),
    'Ab1' + 'é'.repeat(35),
  ])(
    'rejects passwords outside the policy, including UTF-8 byte limits',
    (password) => {
      const result = PasswordObjectValue.create(password);

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(InvalidPasswordError);
    },
  );
});
