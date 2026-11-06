import { Injectable } from '@nestjs/common';
import { PasswordChangesRepository } from '../../../../domain/accounts/application/repositories/password-changes-repository.ts';
import { PrismaService } from '../prisma.service.ts';

@Injectable()
export class PrismaPasswordChangesRepository extends PasswordChangesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async changeAndRevoke(input: {
    userId: string;
    expectedHash: string;
    newHash: string;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const changed = await tx.user.updateMany({
        where: { id: input.userId, password_hash: input.expectedHash },
        data: { password_hash: input.newHash, updated_at: now },
      });
      if (changed.count !== 1) return false;
      // Use the time after obtaining the user row lock: a competing login may have committed while waiting.
      const revokedAt = new Date();
      await tx.authSession.updateMany({
        where: { user_id: input.userId, revoked_at: null },
        data: { revoked_at: revokedAt },
      });
      return true;
    });
  }
}
