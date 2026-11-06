import { Injectable } from '@nestjs/common';
import { BranchesRepository } from '../../../../domain/organizations/application/repositories/branches-repository.ts';
import type { Branch } from '../../../../domain/organizations/enterprise/branch.ts';
import { PrismaService } from '../prisma.service.ts';
import { PrismaOrganizationMapper } from '../mappers/prisma-organization-mapper.ts';

@Injectable()
export class PrismaBranchesRepository extends BranchesRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByOrganizationId(organizationId: string) {
    const records = await this.prisma.branch.findMany({
      where: { organization_id: organizationId },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });

    return records.map(PrismaOrganizationMapper.branchToDomain);
  }

  async create(branch: Branch): Promise<void> {
    await this.prisma.branch.create({
      data: {
        id: branch.id.toString(),
        organization_id: branch.organization_id.toString(),
        name: branch.name.value,
        city: branch.city.value,
        created_at: branch.created_at,
      },
    });
  }
}
