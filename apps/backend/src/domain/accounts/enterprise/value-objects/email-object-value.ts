import { z } from 'zod';
import { ValueObject } from '../../../../core/entities/object-value.ts';
import { left, right, type Either } from '../../../../core/either.ts';
import { InvalidEmailError } from '../errors/invalid-email-error.ts';

export class EmailObjectValue extends ValueObject<{ value: string }> {
  get value() {
    return this.props.value;
  }

  static create(value: string): Either<InvalidEmailError, EmailObjectValue> {
    if (typeof value !== 'string') {
      return left(new InvalidEmailError());
    }

    const normalized = value.trim().toLowerCase();

    if (!z.email().safeParse(normalized).success) {
      return left(new InvalidEmailError());
    }

    return right(new EmailObjectValue({ value: normalized }));
  }
}
