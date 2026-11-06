import { Injectable } from '@nestjs/common';
import type { Either } from '../../../../core/either.ts';
import type { User } from '../../enterprise/user.ts';
import type { UserAlreadyExistsError } from '../errors/user-already-exists-error.ts';

@Injectable()
export abstract class UsersRepository {
  abstract findById(id: string): Promise<User | null>;

  // Receives the normalized value of EmailObjectValue.
  abstract findByEmail(email: string): Promise<User | null>;

  // Implementations must enforce email uniqueness atomically, including concurrent creates.
  abstract create(user: User): Promise<Either<UserAlreadyExistsError, null>>;
}
