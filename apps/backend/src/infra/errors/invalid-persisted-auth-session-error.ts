export class InvalidPersistedAuthSessionError extends Error {
  constructor() {
    super(
      'Persisted authentication session data is incompatible with the domain.',
    );
    this.name = 'InvalidPersistedAuthSessionError';
  }
}
