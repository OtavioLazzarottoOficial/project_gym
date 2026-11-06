import { Injectable } from '@nestjs/common';
import { MembershipsRepository } from '../../../../domain/organizations/application/repositories/memberships-repository.ts';
import type { User } from '../../../../domain/accounts/enterprise/user.ts';
import type { Membership } from '../../../../domain/organizations/enterprise/membership.ts';
import { PrismaService } from '../prisma.service.ts';
import { PrismaUserMapper } from '../mappers/prisma-user-mapper.ts';
import { PrismaOrganizationMapper } from '../mappers/prisma-organization-mapper.ts';
import { PrismaMembershipWriteErrorHandler } from '../../../errors/prisma/prisma-membership-write-error-handler.ts';

@Injectable()
export class PrismaMembershipsRepository extends MembershipsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly handler: PrismaMembershipWriteErrorHandler,
  ) {
    super();
  }

  async findByUserAndOrganization(userId: string, organizationId: string) {
    const raw = await this.prisma.membership.findUnique({
      where: {
        organization_id_user_id: {
          organization_id: organizationId,
          user_id: userId,
        },
      },
    });

    return raw ? PrismaOrganizationMapper.membershipToDomain(raw) : null;
  }

  async findByUserId(userId: string) {
    const records = await this.prisma.membership.findMany({
      where: { user_id: userId },
    });

    return records.map(PrismaOrganizationMapper.membershipToDomain);
  }

  async register(user: User, membership: Membership) {
    return this.handler.execute(() =>
      this.prisma.$transaction(async (transaction) => {
        const identity = await transaction.user.upsert({
          where: { email: user.email.value },
          create: PrismaUserMapper.toPrisma(user),
          update: {},
        });
        const storedMembership = await transaction.membership.create({
          data: {
            id: membership.id.toString(),
            user_id: identity.id,
            organization_id: membership.organization_id.toString(),
            role: membership.role,
            created_at: membership.created_at,
          },
        });

        return {
          user: PrismaUserMapper.toDomain(identity),
          membership:
            PrismaOrganizationMapper.membershipToDomain(storedMembership),
        };
      }),
    );
  }
}
