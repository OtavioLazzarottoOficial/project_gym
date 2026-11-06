import { describe, expect, it } from 'vitest';
import { PhoneObjectValue } from './phone-object-value.ts';

describe('Phone object value', () => {
  it.each([
    ['(49) 99999-0000', '49999990000'],
    ['(49) 3333-0000', '4933330000'],
  ])('normalizes %s', (input, expected) => {
    const result = PhoneObjectValue.create(input);
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.value).toBe(expected);
  });

  it.each([
    '',
    '0033330000',
    '(20) 99999-0000',
    '4999999',
    '+55 49 99999-0000',
    '49abc999990000',
    '(49 99999-0000',
    '49) 99999-0000',
  ])('rejects invalid phone %s', (input) => {
    expect(PhoneObjectValue.create(input).isLeft()).toBe(true);
  });
});
