import { Injectable } from '@nestjs/common';
import type { Organization } from '../../enterprise/organization.ts';

@Injectable()
export abstract class OrganizationsRepository {
  abstract findById(id: string): Promise<Organization | null>;

  abstract findAll(): Promise<Organization[]>;

  abstract create(organization: Organization): Promise<void>;
}
