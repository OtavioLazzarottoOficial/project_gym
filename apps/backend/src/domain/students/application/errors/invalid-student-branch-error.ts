export class InvalidStudentBranchError extends Error {
  constructor() {
    super('A unidade principal não pertence à rede.');
    this.name = 'InvalidStudentBranchError';
  }
}
