export class InvalidPersistedStudentError extends Error {
  constructor() {
    super('Dados persistidos do aluno inválidos.');
    this.name = 'InvalidPersistedStudentError';
  }
}
