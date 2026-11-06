import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  currentAccount,
  login,
  logout,
  parseAccount,
  registerAccount,
  reissueInvitation,
  acceptInvitation,
  changePassword,
} from './accounts-api.ts';

const user = {
  id: 'user-id',
  name: 'Maria',
  email: 'maria@example.com',
  is_platform_admin: false,
  awaiting_password: false,
  created_at: '2026-11-04T14:00:00Z',
  updated_at: null,
};

describe('Account API client', () => {
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

  it('sends login credentials without an Authorization header and reads the session contract', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'signed-token',
          expires_at: '2026-11-04T22:00:00Z',
          user,
        }),
        { status: 200 },
      ),
    );
    const session = await login('maria@example.com', ' Secret123 ');

    expect(session.user.name).toBe('Maria');
    expect(session.access_token).toBe('signed-token');
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('http://localhost:3000/sessions');
    expect(options?.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(String(options?.body))).toEqual({
      email: 'maria@example.com',
      password: ' Secret123 ',
    });
  });

  it('sends the bearer token for account registration and returns only public fields', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: { ...user, password_hash: 'private-hash' },
          membership: { organization_id: 'network-id', role: 'student' },
          invitation: { status: 'sent' },
        }),
        { status: 201 },
      ),
    );
    const result = await registerAccount('signed-token', 'network-id', {
      name: 'Maria',
      email: user.email,
      role: 'student',
    });

    expect(fetchMock.mock.calls[0][1]?.headers).toHaveProperty(
      'Authorization',
      'Bearer signed-token',
    );
    expect(result.user).not.toHaveProperty('password_hash');
    expect(
      JSON.parse(String(fetchMock.mock.calls[0][1]?.body)),
    ).not.toHaveProperty('requestedBy');
  });

  it('surfaces duplicate email and session expiration with stable statuses', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 409 }));
    await expect(
      registerAccount('token', 'network-id', {
        name: 'Maria',
        email: user.email,
        role: 'student',
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: 'Esta conta já está vinculada a esta rede.',
    });
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    await expect(currentAccount('expired')).rejects.toBeInstanceOf(ApiError);
  });

  it('never displays unexpected private server error details', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'private connection password' }), {
        status: 500,
      }),
    );

    await expect(login(user.email, 'Secret123')).rejects.toThrow(
      'O serviço não conseguiu concluir a operação.',
    );
  });

  it('requests a new invite using the selected network and bearer token', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ invitation: { status: 'delivery_failed' } }),
        { status: 200 },
      ),
    );
    const result = await reissueInvitation('token', 'network-id', 'user-id');
    expect(result).toEqual({ status: 'delivery_failed' });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:3000/organizations/network-id/users/user-id/invitation',
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toHaveProperty(
      'Authorization',
      'Bearer token',
    );
  });

  it('submits the first password to the public invitation endpoint', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await acceptInvitation('invite-token', 'Password123');
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:3000/invitations/accept',
    );
    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty(
      'Authorization',
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      token: 'invite-token',
      password: 'Password123',
    });
  });

  it('sends password changes for the signed-in account', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await changePassword('token', 'OldPassword123', 'NewPassword456');
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:3000/me/password',
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe('PATCH');
    expect(fetchMock.mock.calls[0][1]?.headers).toHaveProperty(
      'Authorization',
      'Bearer token',
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword456',
    });
  });

  it('logs out with DELETE and accepts an empty 204 body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(logout('token')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:3000/sessions/current',
    );
  });

  it('rejects malformed success responses instead of pretending to be logged in', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: 'token', expires_at: 'invalid', user }),
        { status: 200 },
      ),
    );

    await expect(login(user.email, 'Secret123')).rejects.toThrow(
      'Não foi possível confirmar a sessão.',
    );
    expect(() =>
      parseAccount({ ...user, is_platform_admin: 'invalid' }),
    ).toThrow();
  });

  it('handles an invalid success body without exposing parser details', async () => {
    fetchMock.mockResolvedValue(
      new Response('<html>invalid</html>', { status: 200 }),
    );

    await expect(login(user.email, 'Secret123')).rejects.toThrow(
      'O serviço retornou uma resposta inválida.',
    );
  });

  it('reports connectivity failures in Portuguese', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(login(user.email, 'Secret123')).rejects.toThrow(
      'Não foi possível conectar ao serviço.',
    );
  });
});
