export class InvalidPersistedUserError extends Error {
  constructor() {
    super('Persisted user data is incompatible with the account domain.');
    this.name = 'InvalidPersistedUserError';
  }
}
