import { describe, expect, it } from 'vitest';
import { NameObjectValue } from './name-object-value.ts';
import { InvalidNameError } from '../errors/invalid-name-error.ts';

describe('NameObjectValue', () => {
  it.each(['Maria Silva', 'a'.repeat(120)])(
    'accepts a filled name within the limit',
    (name) => {
      const result = NameObjectValue.create(name);

      expect(result.isRight()).toBe(true);
    },
  );

  it.each(['', '   ', '\t\n', 'a'.repeat(121)])(
    'rejects an empty or oversized name',
    (name) => {
      const result = NameObjectValue.create(name);

      expect(result.isLeft()).toBe(true);
      expect(result.value).toBeInstanceOf(InvalidNameError);
    },
  );
});
