import type { JwtService } from '@nestjs/jwt';
import type { User } from '../../src/domain/accounts/enterprise/user.ts';
import type { AuthSessionsRepository } from '../../src/domain/auth/application/repositories/auth-sessions-repository.ts';
import { makeAuthSession } from '../factories/make-auth-session.ts';

export async function issueSession(
  jwt: JwtService,
  sessions: AuthSessionsRepository,
  user: User,
  extra: Record<string, unknown> = {},
) {
  const session = makeAuthSession({
    user_id: user.id,
    created_at: new Date(Math.floor(Date.now() / 1000) * 1000),
  });
  await sessions.create(session);

  return jwt.signAsync({
    sub: user.id.toString(),
    sid: session.id.toString(),
    iat: session.created_at.getTime() / 1000,
    exp: session.expires_at.getTime() / 1000,
    ...extra,
  });
}
