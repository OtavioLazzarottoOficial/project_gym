export class InvalidUserRoleError extends Error {
  constructor() {
    super('User role must be admin, instructor or student.');
    this.name = 'InvalidUserRoleError';
  }
}
