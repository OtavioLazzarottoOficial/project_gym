import { Injectable } from '@nestjs/common';
import { InvitationsRepository } from '../../../../domain/accounts/application/repositories/invitations-repository.ts';
import { PrismaService } from '../prisma.service.ts';

@Injectable()
export class PrismaInvitationsRepository extends InvitationsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async issue(input: {
    membershipId: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${input.userId}, 192875423))`;
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { password_hash: true },
      });
      if (!user || user.password_hash !== null) return false;
      const membership = await tx.membership.findFirst({
        where: { id: input.membershipId, user_id: input.userId },
        select: { id: true },
      });
      if (!membership) return false;
      await tx.passwordInvitation.upsert({
        where: { membership_id: input.membershipId },
        create: {
          membership_id: input.membershipId,
          token_hash: input.tokenHash,
          expires_at: input.expiresAt,
        },
        update: {
          token_hash: input.tokenHash,
          expires_at: input.expiresAt,
          used_at: null,
        },
      });
      return true;
    });
  }

  async consume(input: {
    tokenHash: string;
    passwordHash: string;
    now: Date;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const invitation = await tx.passwordInvitation.findUnique({
        where: { token_hash: input.tokenHash },
        include: { membership: { select: { user_id: true } } },
      });
      if (!invitation) return false;
      const userId = invitation.membership.user_id;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 192875423))`;
      const now = new Date(Math.max(input.now.getTime(), Date.now()));
      const valid = await tx.passwordInvitation.findFirst({
        where: {
          id: invitation.id,
          token_hash: input.tokenHash,
          used_at: null,
          expires_at: { gt: now },
        },
        select: { id: true },
      });
      if (!valid) return false;
      const updated = await tx.user.updateMany({
        where: { id: userId, password_hash: null },
        data: { password_hash: input.passwordHash, updated_at: now },
      });
      if (updated.count !== 1) return false;
      await tx.passwordInvitation.update({
        where: { id: invitation.id },
        data: { used_at: now },
      });
      return true;
    });
  }
}
