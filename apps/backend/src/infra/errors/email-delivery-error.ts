export class EmailDeliveryError extends Error {
  constructor() {
    super(
      'Não foi possível enviar o email. Confira a configuração e tente novamente.',
    );
    this.name = 'EmailDeliveryError';
  }
}
