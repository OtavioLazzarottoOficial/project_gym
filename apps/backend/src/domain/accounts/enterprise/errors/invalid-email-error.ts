export class InvalidEmailError extends Error {
  constructor() {
    super('Email must be valid.');
    this.name = 'InvalidEmailError';
  }
}
