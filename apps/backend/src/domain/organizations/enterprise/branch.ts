import { Entity } from '../../../core/entities/entity.ts';
import type { UniqueEntityID } from '../../../core/entities/unique-entity-id.ts';
import { left, right, type Either } from '../../../core/either.ts';
import { NameObjectValue } from '../../accounts/enterprise/value-objects/name-object-value.ts';
import type { InvalidNameError } from '../../accounts/enterprise/errors/invalid-name-error.ts';
import { InvalidOrganizationError } from './errors/invalid-organization-error.ts';

export interface BranchProps {
  organization_id: UniqueEntityID;
  name: NameObjectValue;
  city: NameObjectValue;
  created_at: Date;
}

export class Branch extends Entity<BranchProps> {
  private constructor(props: BranchProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get organization_id() {
    return this.props.organization_id;
  }

  get name() {
    return this.props.name;
  }

  get city() {
    return this.props.city;
  }

  get created_at() {
    return new Date(this.props.created_at);
  }

  static create(
    props: {
      organization_id: UniqueEntityID;
      name: string;
      city: string;
      created_at?: Date;
    },
    id?: UniqueEntityID,
  ): Either<InvalidNameError | InvalidOrganizationError, Branch> {
    if (!props.organization_id.toString().trim()) {
      return left(new InvalidOrganizationError());
    }

    const name = NameObjectValue.create(props.name);
    const city = NameObjectValue.create(props.city);

    if (name.isLeft()) {
      return left(name.value);
    }

    if (city.isLeft()) {
      return left(city.value);
    }

    return right(
      new Branch(
        {
          organization_id: props.organization_id,
          name: name.value,
          city: city.value,
          created_at: new Date(props.created_at ?? new Date()),
        },
        id,
      ),
    );
  }
}
