import type { UseCaseError } from '../../../../core/error/use-case-error.ts';

export class NotAllowedError extends Error implements UseCaseError {
  constructor() {
    super('Only an authenticated administrator can create accounts.');
    this.name = 'NotAllowedError';
  }
}
