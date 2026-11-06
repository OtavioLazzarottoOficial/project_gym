import { Entity } from '../../../core/entities/entity.ts';
import type { UniqueEntityID } from '../../../core/entities/unique-entity-id.ts';
import { left, right, type Either } from '../../../core/either.ts';
import { NameObjectValue } from '../../accounts/enterprise/value-objects/name-object-value.ts';
import type { InvalidNameError } from '../../accounts/enterprise/errors/invalid-name-error.ts';

export class Organization extends Entity<{
  name: NameObjectValue;
  created_at: Date;
}> {
  private constructor(
    props: { name: NameObjectValue; created_at: Date },
    id?: UniqueEntityID,
  ) {
    super(props, id);
  }

  get name() {
    return this.props.name;
  }

  get created_at() {
    return new Date(this.props.created_at);
  }

  static create(
    props: { name: string; created_at?: Date },
    id?: UniqueEntityID,
  ): Either<InvalidNameError, Organization> {
    const name = NameObjectValue.create(props.name);

    if (name.isLeft()) {
      return left(name.value);
    }

    return right(
      new Organization(
        {
          name: name.value,
          created_at: new Date(props.created_at ?? new Date()),
        },
        id,
      ),
    );
  }
}
