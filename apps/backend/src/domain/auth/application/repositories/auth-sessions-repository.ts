import { Injectable } from '@nestjs/common';
import type { AuthSession } from '../../enterprise/auth-session.ts';

@Injectable()
export abstract class AuthSessionsRepository {
  abstract create(session: AuthSession): Promise<void>;

  // Issue a login session only while the password hash verified by the caller is still current.
  abstract createIfPasswordMatches(
    session: AuthSession,
    expectedHash: string,
  ): Promise<boolean>;

  abstract findById(id: string): Promise<AuthSession | null>;

  // Atomically revoke only this user's session; never overwrite an earlier revocation.
  abstract revokeById(id: string, userId: string, at: Date): Promise<void>;
}
