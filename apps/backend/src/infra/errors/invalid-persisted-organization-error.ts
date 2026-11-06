export class InvalidPersistedOrganizationError extends Error {
  constructor() {
    super('Persisted organization data is incompatible with the domain.');
    this.name = 'InvalidPersistedOrganizationError';
  }
}
