import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class InvitationsRepository {
  abstract issue(input: {
    membershipId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<boolean>;
  abstract consume(input: {
    tokenHash: string;
    passwordHash: string;
    now: Date;
  }): Promise<boolean>;
}
