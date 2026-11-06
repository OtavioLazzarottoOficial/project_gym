import { BranchesRepository } from '../../src/domain/organizations/application/repositories/branches-repository.ts';
import type { Branch } from '../../src/domain/organizations/enterprise/branch.ts';

export class BranchesRepositoryInMemory extends BranchesRepository {
  items: Branch[] = [];
  async findByOrganizationId(id: string) {
    return this.items.filter((item) => item.organization_id.toString() === id);
  }
  async create(item: Branch) {
    this.items.push(item);
  }
}
