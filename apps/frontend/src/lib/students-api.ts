import { apiRequest, ApiError } from './accounts-api.ts';

export type Contact = { name: string; phone: string; relationship: string };
export type Address = {
  postalCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
};
export type StudentInput = {
  branchId: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birthDate: string;
  address?: Address;
  emergencyContact?: Contact;
  guardian?: Contact;
};
export type Student = {
  id: string;
  organization_id: string;
  branch_id: string;
  user_id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string;
  birth_date: string;
  address: Address | null;
  emergency_contact: Contact | null;
  guardian: Contact | null;
};
export type StudentPage = {
  students: Student[];
  pagination: { page: number; page_size: number; has_next_page: boolean };
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function contact(value: unknown): Contact | null {
  if (value === null) return null;
  if (
    !record(value) ||
    typeof value.name !== 'string' ||
    typeof value.phone !== 'string' ||
    typeof value.relationship !== 'string'
  )
    throw new Error('Dados de contato inválidos.');
  return {
    name: value.name,
    phone: value.phone,
    relationship: value.relationship,
  };
}

function address(value: unknown): Address | null {
  if (value === null) return null;
  if (
    !record(value) ||
    typeof value.postalCode !== 'string' ||
    typeof value.street !== 'string' ||
    typeof value.number !== 'string' ||
    typeof value.neighborhood !== 'string' ||
    typeof value.city !== 'string' ||
    typeof value.state !== 'string' ||
    !(value.complement === undefined || typeof value.complement === 'string')
  )
    throw new Error('Dados de endereço inválidos.');
  return {
    postalCode: value.postalCode,
    street: value.street,
    number: value.number,
    neighborhood: value.neighborhood,
    city: value.city,
    state: value.state,
    ...(value.complement ? { complement: value.complement } : {}),
  };
}

function student(value: unknown, organizationId: string): Student {
  if (
    !record(value) ||
    value.organization_id !== organizationId ||
    typeof value.id !== 'string' ||
    typeof value.branch_id !== 'string' ||
    typeof value.user_id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.cpf !== 'string' ||
    typeof value.phone !== 'string' ||
    typeof value.birth_date !== 'string'
  )
    throw new Error('Dados de aluno inválidos.');
  return {
    id: value.id,
    organization_id: organizationId,
    branch_id: value.branch_id,
    user_id: value.user_id,
    name: value.name,
    email: value.email,
    cpf: value.cpf,
    phone: value.phone,
    birth_date: value.birth_date,
    address: address(value.address),
    emergency_contact: contact(value.emergency_contact),
    guardian: contact(value.guardian),
  };
}

export async function listStudents(
  token: string,
  organizationId: string,
  page: number,
): Promise<StudentPage> {
  const result = await apiRequest(
    `organizations/${encodeURIComponent(organizationId)}/students?page=${page}`,
    { token },
  );
  if (
    !record(result) ||
    !Array.isArray(result.students) ||
    !record(result.pagination) ||
    result.pagination.page !== page ||
    !Number.isSafeInteger(result.pagination.page_size) ||
    typeof result.pagination.has_next_page !== 'boolean'
  )
    throw new Error('Lista de alunos inválida.');
  return {
    students: result.students.map((item) => student(item, organizationId)),
    pagination: {
      page,
      page_size: result.pagination.page_size as number,
      has_next_page: result.pagination.has_next_page,
    },
  };
}

export async function registerStudent(
  token: string,
  organizationId: string,
  input: StudentInput,
): Promise<{ status: 'sent' | 'delivery_failed' | 'already_active' }> {
  let result: unknown;
  try {
    result = await apiRequest(
      `organizations/${encodeURIComponent(organizationId)}/students`,
      { token, method: 'POST', body: input, timeoutMs: 60000 },
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 409)
      throw new ApiError(
        409,
        'Não foi possível vincular os dados informados nesta rede. Verifique o CPF e o email ou se o aluno já está cadastrado.',
      );
    throw error;
  }
  if (
    !record(result) ||
    !record(result.student) ||
    result.student.organization_id !== organizationId ||
    !record(result.invitation) ||
    !['sent', 'delivery_failed', 'already_active'].includes(
      String(result.invitation.status),
    )
  )
    throw new Error(
      'Não foi possível confirmar o cadastro. Consulte a lista antes de tentar novamente.',
    );
  return {
    status: result.invitation.status as
      'sent' | 'delivery_failed' | 'already_active',
  };
}
