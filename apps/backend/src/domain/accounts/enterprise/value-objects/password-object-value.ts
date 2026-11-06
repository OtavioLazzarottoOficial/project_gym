import { ValueObject } from '../../../../core/entities/object-value.ts';
import { left, right, type Either } from '../../../../core/either.ts';
import { InvalidPasswordError } from '../errors/invalid-password-error.ts';

// Validates the original password, never a persisted hash. Not stored in User.
export class PasswordObjectValue extends ValueObject<{ value: string }> {
  get value() {
    return this.props.value;
  }

  static create(
    value: string,
  ): Either<InvalidPasswordError, PasswordObjectValue> {
    if (
      typeof value !== 'string' ||
      Array.from(value).length < 8 ||
      new TextEncoder().encode(value).byteLength > 72 ||
      !/\p{Lu}/u.test(value) ||
      !/\p{Ll}/u.test(value) ||
      !/[0-9]/.test(value)
    ) {
      return left(new InvalidPasswordError());
    }

    return right(new PasswordObjectValue({ value }));
  }
}
