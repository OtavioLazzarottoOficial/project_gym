import { describe, expect, it } from 'vitest';
import { ValueObject } from './object-value.ts';

class ExampleObjectValue extends ValueObject<{ value: string }> {
  static create(value: string) {
    return new ExampleObjectValue({ value });
  }
}

describe('ValueObject equality', () => {
  it('rejects null and undefined', () => {
    const value = ExampleObjectValue.create('example');
    expect(value.equals(null)).toBe(false);
    expect(value.equals(undefined)).toBe(false);
  });

  it('compares instances by their values', () => {
    const value = ExampleObjectValue.create('example');
    expect(value.equals(value)).toBe(true);
    expect(value.equals(ExampleObjectValue.create('example'))).toBe(true);
    expect(value.equals(ExampleObjectValue.create('different'))).toBe(false);
  });
});
