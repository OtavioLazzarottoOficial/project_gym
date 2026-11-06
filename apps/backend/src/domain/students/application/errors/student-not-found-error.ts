export class StudentNotFoundError extends Error {
  constructor() {
    super('Aluno não encontrado nesta rede.');
  }
}
