export class MembershipAlreadyExistsError extends Error {
  constructor() {
    super('This account already belongs to this organization.');
    this.name = 'MembershipAlreadyExistsError';
  }
}
