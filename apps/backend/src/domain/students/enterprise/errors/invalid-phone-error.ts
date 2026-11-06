export class InvalidPhoneError extends Error {
  constructor() {
    super('Telefone brasileiro com DDD inválido.');
    this.name = 'InvalidPhoneError';
  }
}
