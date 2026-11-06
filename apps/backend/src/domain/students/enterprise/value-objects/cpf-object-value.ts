import { ValueObject } from '../../../../core/entities/object-value.ts';
import { left, right, type Either } from '../../../../core/either.ts';
import { InvalidCpfError } from '../errors/invalid-cpf-error.ts';

export class CpfObjectValue extends ValueObject<{ value: string }> {
  get value() {
    return this.props.value;
  }

  static create(input: string): Either<InvalidCpfError, CpfObjectValue> {
    if (typeof input !== 'string') {
      return left(new InvalidCpfError());
    }

    const value = input.trim();

    if (!/^(?:[0-9]{11}|[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2})$/.test(value)) {
      return left(new InvalidCpfError());
    }

    const digits = value.replace(/[.-]/g, '');

    if (/^([0-9])\1{10}$/.test(digits)) {
      return left(new InvalidCpfError());
    }

    for (const length of [9, 10]) {
      let sum = 0;

      for (let index = 0; index < length; index++) {
        sum += Number(digits[index]) * (length + 1 - index);
      }

      const remainder = (sum * 10) % 11;
      const expected = remainder === 10 ? 0 : remainder;

      if (Number(digits[length]) !== expected) {
        return left(new InvalidCpfError());
      }
    }

    return right(new CpfObjectValue({ value: digits }));
  }
}
