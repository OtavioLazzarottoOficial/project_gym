import { Entity } from '../../../core/entities/entity.ts';
import type { UniqueEntityID } from '../../../core/entities/unique-entity-id.ts';
import { left, right, type Either } from '../../../core/either.ts';
import type { Optional } from '../../../core/types/optional.ts';
import { InvalidAuthSessionError } from './errors/invalid-auth-session-error.ts';

export const AUTH_SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export interface AuthSessionProps {
  user_id: UniqueEntityID;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

export type CreateAuthSessionProps = Optional<
  AuthSessionProps,
  'created_at' | 'expires_at' | 'revoked_at'
>;

export class AuthSession extends Entity<AuthSessionProps> {
  private constructor(props: AuthSessionProps, id?: UniqueEntityID) {
    super(props, id);
  }

  get user_id() {
    return this.props.user_id;
  }

  get created_at() {
    return new Date(this.props.created_at);
  }

  get expires_at() {
    return new Date(this.props.expires_at);
  }

  get revoked_at() {
    return this.props.revoked_at ? new Date(this.props.revoked_at) : null;
  }

  isActiveAt(at: Date) {
    return (
      this.props.revoked_at === null &&
      at.getTime() >= this.props.created_at.getTime() &&
      at.getTime() < this.props.expires_at.getTime()
    );
  }

  revoke(at: Date): Either<InvalidAuthSessionError, null> {
    if (
      !Number.isFinite(at.getTime()) ||
      at.getTime() < this.props.created_at.getTime()
    ) {
      return left(new InvalidAuthSessionError());
    }

    if (this.props.revoked_at === null) {
      this.props.revoked_at = new Date(at);
    }

    return right(null);
  }

  static create(
    props: CreateAuthSessionProps,
    id?: UniqueEntityID,
  ): Either<InvalidAuthSessionError, AuthSession> {
    const createdAt = new Date(props.created_at ?? new Date());
    const expiresAt = new Date(
      props.expires_at ??
        new Date(createdAt.getTime() + AUTH_SESSION_DURATION_MS),
    );
    const revokedAt = props.revoked_at ? new Date(props.revoked_at) : null;

    if (
      !props.user_id.toString().trim() ||
      !Number.isFinite(createdAt.getTime()) ||
      !Number.isFinite(expiresAt.getTime()) ||
      expiresAt.getTime() - createdAt.getTime() !== AUTH_SESSION_DURATION_MS ||
      (revokedAt !== null &&
        (!Number.isFinite(revokedAt.getTime()) ||
          revokedAt.getTime() < createdAt.getTime()))
    ) {
      return left(new InvalidAuthSessionError());
    }

    return right(
      new AuthSession(
        {
          user_id: props.user_id,
          created_at: createdAt,
          expires_at: expiresAt,
          revoked_at: revokedAt,
        },
        id,
      ),
    );
  }
}
