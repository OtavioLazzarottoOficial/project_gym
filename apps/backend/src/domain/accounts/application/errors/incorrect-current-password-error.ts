export class IncorrectCurrentPasswordError extends Error {
  constructor() {
    super('Senha atual incorreta ou alterada.');
    this.name = 'IncorrectCurrentPasswordError';
  }
}
