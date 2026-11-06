export class StudentIdentityConflictError extends Error {
  constructor() {
    super('Não foi possível vincular os dados informados à conta.');
    this.name = 'StudentIdentityConflictError';
  }
}
