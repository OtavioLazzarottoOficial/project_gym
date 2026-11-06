export class InvalidSessionError extends Error {
  constructor() {
    super('Authentication session is invalid or expired.');
    this.name = 'InvalidSessionError';
  }
}
