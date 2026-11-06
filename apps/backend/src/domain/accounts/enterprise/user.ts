import { Entity } from '../../../core/entities/entity.ts';
import type { UniqueEntityID } from '../../../core/entities/unique-entity-id.ts';
import type { Optional } from '../../../core/types/optional.ts';
import { left, right, type Either } from '../../../core/either.ts';
import { InvalidPlatformAccessError } from './errors/invalid-platform-access-error.ts';
import type { InvalidNameError } from './errors/invalid-name-error.ts';
import type { InvalidEmailError } from './errors/invalid-email-error.ts';
import { NameObjectValue } from './value-objects/name-object-value.ts';
import { EmailObjectValue } from './value-objects/email-object-value.ts';

export interface UserProps {
  name: NameObjectValue;
  email: EmailObjectValue;
  is_platform_admin: boolean;
  password_hash: string | null;
  created_at: Date;
  updated_at: Date | null;
}

export type CreateUserProps = Optional<
  Omit<UserProps, 'name' | 'email'> & { name: string; email: string },
  'password_hash' | 'created_at' | 'updated_at' | 'is_platform_admin'
>;

export type InvalidUserError =
  InvalidNameError | InvalidEmailError | InvalidPlatformAccessError;

export class User extends Entity<UserProps> {
  private constructor(props: UserProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get name() {
    return this.props.name;
  }

  get email() {
    return this.props.email;
  }

  get is_platform_admin() {
    return this.props.is_platform_admin;
  }

  get password_hash() {
    return this.props.password_hash;
  }

  get isAwaitingPassword() {
    return this.props.password_hash === null;
  }

  get created_at() {
    return new Date(this.props.created_at);
  }

  get updated_at() {
    return this.props.updated_at ? new Date(this.props.updated_at) : null;
  }

  static create(
    props: CreateUserProps,
    id?: UniqueEntityID,
  ): Either<InvalidUserError, User> {
    const name = NameObjectValue.create(props.name);

    if (name.isLeft()) {
      return left(name.value);
    }

    const email = EmailObjectValue.create(props.email);

    if (email.isLeft()) {
      return left(email.value);
    }

    if (
      props.is_platform_admin !== undefined &&
      typeof props.is_platform_admin !== 'boolean'
    ) {
      return left(new InvalidPlatformAccessError());
    }

    return right(
      new User(
        {
          name: name.value,
          email: email.value,
          is_platform_admin: props.is_platform_admin ?? false,
          password_hash: props.password_hash ?? null,
          created_at: new Date(props.created_at ?? new Date()),
          updated_at: props.updated_at ? new Date(props.updated_at) : null,
        },
        id,
      ),
    );
  }
}
