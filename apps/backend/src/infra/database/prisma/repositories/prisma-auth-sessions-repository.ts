import { Injectable } from '@nestjs/common';
import { AuthSessionsRepository } from '../../../../domain/auth/application/repositories/auth-sessions-repository.ts';
import type { AuthSession } from '../../../../domain/auth/enterprise/auth-session.ts';
import { PrismaAuthSessionMapper } from '../mappers/prisma-auth-session-mapper.ts';
import { PrismaService } from '../prisma.service.ts';

@Injectable()
export class PrismaAuthSessionsRepository extends AuthSessionsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(session: AuthSession): Promise<void> {
    await this.prisma.authSession.create({
      data: PrismaAuthSessionMapper.toPrisma(session),
    });
  }

  async createIfPasswordMatches(
    session: AuthSession,
    expectedHash: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // A conditional row update serializes this login with password changes.
      const user = await tx.user.updateMany({
        where: { id: session.user_id.toString(), password_hash: expectedHash },
        data: { password_hash: expectedHash },
      });
      if (user.count !== 1) return false;
      await tx.authSession.create({
        data: PrismaAuthSessionMapper.toPrisma(session),
      });
      return true;
    });
  }

  async findById(id: string): Promise<AuthSession | null> {
    const session = await this.prisma.authSession.findUnique({ where: { id } });

    return session ? PrismaAuthSessionMapper.toDomain(session) : null;
  }

  async revokeById(id: string, userId: string, at: Date): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id, user_id: userId, revoked_at: null },
      data: { revoked_at: at },
    });
  }
}
