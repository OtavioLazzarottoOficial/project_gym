export class FirstAdministratorAlreadyExistsError extends Error {
  constructor() {
    super(
      'Já existe um administrador da plataforma. O comando inicial não altera contas existentes.',
    );
    this.name = 'FirstAdministratorAlreadyExistsError';
  }
}
