export class InvalidStudentError extends Error {
  constructor() {
    super('Dados do aluno inválidos.');
    this.name = 'InvalidStudentError';
  }
}
