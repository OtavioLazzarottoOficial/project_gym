import { describe, expect, it } from 'vitest';
import { EmailObjectValue } from './email-object-value.ts';
import { InvalidEmailError } from '../errors/invalid-email-error.ts';

describe('EmailObjectValue', () => {
  it('normalizes whitespace and case and preserves plus addressing', () => {
    const result = EmailObjectValue.create('  Maria+Gym@Example.COM  ');

    expect(result.isRight()).toBe(true);

    if (result.isRight()) {
      expect(result.value.value).toBe('maria+gym@example.com');
      const equivalent = EmailObjectValue.create('maria+gym@example.com');

      if (equivalent.isRight()) {
        expect(result.value.equals(equivalent.value)).toBe(true);
      }
    }
  });

  it.each([
    '',
    ' ',
    'email',
    'a@',
    '@example.com',
    'a b@example.com',
    'a@@example.com',
  ])('rejects %j', (email) => {
    const result = EmailObjectValue.create(email);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidEmailError);
  });
});
