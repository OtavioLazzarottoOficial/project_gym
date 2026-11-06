export class InvalidInvitationError extends Error {
  constructor() {
    super('Convite inválido, expirado ou já utilizado.');
    this.name = 'InvalidInvitationError';
  }
}
