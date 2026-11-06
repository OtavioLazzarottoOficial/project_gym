import type { UseCaseError } from '../../../../core/error/use-case-error.ts';

export class UserAlreadyExistsError extends Error implements UseCaseError {
  constructor() {
    super('An account with this email already exists.');
    this.name = 'UserAlreadyExistsError';
  }
}
