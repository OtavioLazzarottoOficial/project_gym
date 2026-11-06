import { ValueObject } from '../../../../core/entities/object-value.ts';
import { left, right, type Either } from '../../../../core/either.ts';
import { InvalidNameError } from '../errors/invalid-name-error.ts';

export class NameObjectValue extends ValueObject<{ value: string }> {
  get value() {
    return this.props.value;
  }

  static create(value: string): Either<InvalidNameError, NameObjectValue> {
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      Array.from(value).length > 120
    ) {
      return left(new InvalidNameError());
    }

    return right(new NameObjectValue({ value }));
  }
}
