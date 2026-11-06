export class InvalidOrganizationError extends Error {
  constructor() {
    super('Organization, branch or membership data is invalid.');
    this.name = 'InvalidOrganizationError';
  }
}
