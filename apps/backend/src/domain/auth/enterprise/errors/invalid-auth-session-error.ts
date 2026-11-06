export class InvalidAuthSessionError extends Error {
  constructor() {
    super('Authentication session data is invalid.');
    this.name = 'InvalidAuthSessionError';
  }
}
