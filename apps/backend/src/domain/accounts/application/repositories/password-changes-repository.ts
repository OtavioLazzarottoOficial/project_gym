import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class PasswordChangesRepository {
  // Compare the last verified hash and atomically change it and revoke all sessions.
  abstract changeAndRevoke(input: {
    userId: string;
    expectedHash: string;
    newHash: string;
  }): Promise<boolean>;
}
