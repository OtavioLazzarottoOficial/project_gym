import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { InvitationTokens } from '../../domain/accounts/application/cryptography/invitation-tokens.ts';

@Injectable()
export class SecureInvitationTokens extends InvitationTokens {
  generate(): string {
    return randomBytes(32).toString('hex');
  }
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
