import { Injectable } from '@nestjs/common';
import { OrganizationsRepository } from '../../../../domain/organizations/application/repositories/organizations-repository.ts';
import type { Organization } from '../../../../domain/organizations/enterprise/organization.ts';
import { PrismaService } from '../prisma.service.ts';
import { PrismaOrganizationMapper } from '../mappers/prisma-organization-mapper.ts';

@Injectable()
export class PrismaOrganizationsRepository extends OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string) {
    const raw = await this.prisma.organization.findUnique({ where: { id } });

    return raw ? PrismaOrganizationMapper.toDomain(raw) : null;
  }

  async findAll() {
    const records = await this.prisma.organization.findMany({
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });

    return records.map(PrismaOrganizationMapper.toDomain);
  }

  async create(organization: Organization): Promise<void> {
    await this.prisma.organization.create({
      data: {
        id: organization.id.toString(),
        name: organization.name.value,
        created_at: organization.created_at,
      },
    });
  }
}
