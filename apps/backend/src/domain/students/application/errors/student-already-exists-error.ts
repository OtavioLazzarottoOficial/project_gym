export class StudentAlreadyExistsError extends Error {
  constructor() {
    super('A pessoa já possui cadastro de aluno nesta rede.');
    this.name = 'StudentAlreadyExistsError';
  }
}
