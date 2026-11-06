import { describe, expect, it } from 'vitest';
import { CpfObjectValue } from './cpf-object-value.ts';

describe('CPF object value', () => {
  it.each(['52998224725', ' 529.982.247-25 '])(
    'accepts and normalizes %s',
    (input) => {
      const result = CpfObjectValue.create(input);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.value).toBe('52998224725');
      }
    },
  );

  it.each([
    '',
    '11111111111',
    '000.000.000-00',
    '529.982.247-24',
    '529abc98224725',
    '5299822472',
    '529/982/247-25',
  ])('rejects invalid CPF %s', (input) => {
    expect(CpfObjectValue.create(input).isLeft()).toBe(true);
  });
});
