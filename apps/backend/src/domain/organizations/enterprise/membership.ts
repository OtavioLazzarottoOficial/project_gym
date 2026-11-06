import { Entity } from '../../../core/entities/entity.ts';
import type { UniqueEntityID } from '../../../core/entities/unique-entity-id.ts';
import { left, right, type Either } from '../../../core/either.ts';
import { UserRole } from '../../accounts/enterprise/enums/user-role.ts';
import { InvalidOrganizationError } from './errors/invalid-organization-error.ts';

export interface MembershipProps {
  organization_id: UniqueEntityID;
  user_id: UniqueEntityID;
  role: UserRole;
  created_at: Date;
}

export class Membership extends Entity<MembershipProps> {
  private constructor(props: MembershipProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get organization_id() {
    return this.props.organization_id;
  }

  get user_id() {
    return this.props.user_id;
  }

  get role() {
    return this.props.role;
  }

  get created_at() {
    return new Date(this.props.created_at);
  }

  static create(
    props: Omit<MembershipProps, 'created_at'> & { created_at?: Date },
    id?: UniqueEntityID,
  ): Either<InvalidOrganizationError, Membership> {
    if (
      !props.organization_id.toString().trim() ||
      !props.user_id.toString().trim() ||
      !Object.values(UserRole).includes(props.role)
    ) {
      return left(new InvalidOrganizationError());
    }

    return right(
      new Membership(
        { ...props, created_at: new Date(props.created_at ?? new Date()) },
        id,
      ),
    );
  }
}
