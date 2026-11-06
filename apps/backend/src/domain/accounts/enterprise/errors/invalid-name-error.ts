export class InvalidNameError extends Error {
  constructor() {
    super('Name must be filled and contain at most 120 characters.');
    this.name = 'InvalidNameError';
  }
}
