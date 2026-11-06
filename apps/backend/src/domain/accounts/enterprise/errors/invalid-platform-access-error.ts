export class InvalidPlatformAccessError extends Error {
  constructor() {
    super('Platform administrator access must be a boolean.');
    this.name = 'InvalidPlatformAccessError';
  }
}
