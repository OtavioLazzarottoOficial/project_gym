import { Injectable } from '@nestjs/common';
import type { Branch } from '../../enterprise/branch.ts';

@Injectable()
export abstract class BranchesRepository {
  abstract findByOrganizationId(organizationId: string): Promise<Branch[]>;

  abstract create(branch: Branch): Promise<void>;
}
