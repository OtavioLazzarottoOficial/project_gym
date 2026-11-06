import { ValueObject } from '../../../../core/entities/object-value.ts';
import { left, right, type Either } from '../../../../core/either.ts';
import { InvalidPhoneError } from '../errors/invalid-phone-error.ts';

// Códigos nacionais em uso: Ministério das Comunicações, agosto de 2026.
const areaCodes = new Set(
  '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(
    ' ',
  ),
);

export class PhoneObjectValue extends ValueObject<{ value: string }> {
  get value() {
    return this.props.value;
  }

  static create(input: string): Either<InvalidPhoneError, PhoneObjectValue> {
    if (
      typeof input !== 'string' ||
      !/^(?:\([0-9]{2}\)|[0-9]{2})(?: *- *| +)?[0-9]{4,5}(?: *- *| +)?[0-9]{4}$/.test(
        input.trim(),
      )
    ) {
      return left(new InvalidPhoneError());
    }

    const digits = input.replace(/[()\s-]/g, '');

    if (
      (digits.length !== 10 && digits.length !== 11) ||
      !areaCodes.has(digits.slice(0, 2))
    ) {
      return left(new InvalidPhoneError());
    }

    return right(new PhoneObjectValue({ value: digits }));
  }
}
