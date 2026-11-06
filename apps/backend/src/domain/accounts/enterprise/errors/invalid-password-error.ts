export class InvalidPasswordError extends Error {
  constructor() {
    super(
      'Password must contain at least 8 characters, uppercase, lowercase and a number, and at most 72 UTF-8 bytes.',
    );
    this.name = 'InvalidPasswordError';
  }
}
