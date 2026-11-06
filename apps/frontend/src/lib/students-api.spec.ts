import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listStudents, registerStudent } from './students-api.ts';

const item = {
  id: 'student-1',
  organization_id: 'network-1',
  branch_id: 'branch-1',
  user_id: 'user-1',
  name: 'Maria',
  email: 'maria@example.test',
  cpf: '52998224725',
  phone: '49999990000',
  birth_date: '2000-01-01',
  address: null,
  emergency_contact: null,
  guardian: null,
};
describe('Students API', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('loads a selected page using the network and session', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          students: [item],
          pagination: { page: 2, page_size: 20, has_next_page: false },
        }),
        { status: 200 },
      ),
    );
    const result = await listStudents('token', 'network-1', 2);
    expect(result.students[0].name).toBe('Maria');
    expect(result.pagination.has_next_page).toBe(false);
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:3000/organizations/network-1/students?page=2',
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toHaveProperty(
      'Authorization',
      'Bearer token',
    );
  });

  it('rejects records from another network', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          students: [{ ...item, organization_id: 'other' }],
          pagination: { page: 1, page_size: 20, has_next_page: false },
        }),
        { status: 200 },
      ),
    );
    await expect(listStudents('token', 'network-1', 1)).rejects.toThrow(
      'Dados de aluno inválidos.',
    );
  });

  it('registers a student and preserves delivery failure as a successful registration', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          student: item,
          invitation: { status: 'delivery_failed' },
        }),
        { status: 201 },
      ),
    );
    const input = {
      branchId: 'branch-1',
      name: 'Maria',
      email: item.email,
      cpf: item.cpf,
      phone: item.phone,
      birthDate: item.birth_date,
    };
    await expect(registerStudent('token', 'network-1', input)).resolves.toEqual(
      { status: 'delivery_failed' },
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(input);
  });

  it('explains a CPF or duplicate conflict without exposing server data', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 409 }));
    await expect(
      registerStudent('token', 'network-1', {
        branchId: 'branch',
        name: 'Maria',
        email: item.email,
        cpf: item.cpf,
        phone: item.phone,
        birthDate: item.birth_date,
      }),
    ).rejects.toThrow('Verifique o CPF e o email');
  });
});
