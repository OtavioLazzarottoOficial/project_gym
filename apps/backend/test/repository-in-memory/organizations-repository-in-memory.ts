import { OrganizationsRepository } from '../../src/domain/organizations/application/repositories/organizations-repository.ts';
import type { Organization } from '../../src/domain/organizations/enterprise/organization.ts';

export class OrganizationsRepositoryInMemory extends OrganizationsRepository {
  items: Organization[] = [];
  async findById(id: string) {
    return this.items.find((item) => item.id.toString() === id) ?? null;
  }
  async findAll() {
    return [...this.items];
  }
  async create(item: Organization) {
    this.items.push(item);
  }
}
