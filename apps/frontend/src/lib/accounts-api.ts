export type AccountRole = 'admin' | 'instructor' | 'student';
export interface Account {
  id: string;
  name: string;
  email: string;
  is_platform_admin: boolean;
  awaiting_password: boolean;
  created_at: string;
  updated_at: string | null;
}
export type Invitation =
  | { status: 'sent' | 'delivery_failed' | 'already_active' }
  | { status: 'manual'; link: string };

function parseInvitation(value: unknown): Invitation {
  if (!isRecord(value)) throw new Error('Resposta de convite inválida.');
  if (value.status === 'manual' && typeof value.link === 'string')
    return { status: 'manual', link: value.link };
  if (
    value.status === 'sent' ||
    value.status === 'delivery_failed' ||
    value.status === 'already_active'
  )
    return { status: value.status };
  throw new Error('Resposta de convite inválida.');
}

export interface LoginResponse {
  access_token: string;
  expires_at: string;
  user: Account;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseAccount(value: unknown): Account {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.is_platform_admin !== 'boolean' ||
    typeof value.awaiting_password !== 'boolean' ||
    typeof value.created_at !== 'string' ||
    !(value.updated_at === null || typeof value.updated_at === 'string')
  ) {
    throw new Error('O servidor retornou dados de conta inválidos.');
  }

  return {
    id: value.id,
    name: value.name,
    email: value.email,
    is_platform_admin: value.is_platform_admin,
    awaiting_password: value.awaiting_password,
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
}

export async function apiRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    timeoutMs?: number;
  } = {},
): Promise<unknown> {
  const configured = import.meta.env.VITE_API_URL;
  let base: URL;

  try {
    base = new URL(configured.endsWith('/') ? configured : configured + '/');

    if (
      !['http:', 'https:'].includes(base.protocol) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    ) {
      throw new Error('Invalid API URL');
    }
  } catch {
    throw new Error('Não foi possível conectar ao serviço.');
  }

  let response: Response;

  try {
    response = await fetch(new URL(path, base), {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(options.timeoutMs ?? 10000),
      cache: 'no-store',
    });
  } catch {
    throw new Error(
      'Não foi possível conectar ao serviço. Confira a conexão e tente novamente.',
    );
  }

  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'Confira os dados informados e tente novamente.',
      401:
        path === 'sessions'
          ? 'Email ou senha incorretos.'
          : 'Sua sessão expirou. Entre novamente.',
      403: 'Você não tem permissão para esta operação nesta rede.',
      409: 'Esta conta já está vinculada a esta rede.',
      429: 'Muitas tentativas. Aguarde um momento e tente novamente.',
    };
    throw new ApiError(
      response.status,
      messages[response.status] ??
        'O serviço não conseguiu concluir a operação. Tente novamente.',
    );
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    throw new Error(
      'O serviço retornou uma resposta inválida. Tente novamente.',
    );
  }
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const data = await apiRequest('sessions', {
    method: 'POST',
    body: { email, password },
  });

  if (
    !isRecord(data) ||
    typeof data.access_token !== 'string' ||
    !data.access_token ||
    typeof data.expires_at !== 'string' ||
    !Number.isFinite(Date.parse(data.expires_at))
  ) {
    throw new Error('Não foi possível confirmar a sessão. Tente novamente.');
  }

  return {
    access_token: data.access_token,
    expires_at: data.expires_at,
    user: parseAccount(data.user),
  };
}

export async function currentAccount(token: string): Promise<Account> {
  const data = await apiRequest('me', { token });

  return parseAccount(isRecord(data) ? data.user : null);
}

export async function registerAccount(
  token: string,
  organizationId: string,
  input: { name: string; email: string; role: AccountRole },
): Promise<{
  user: Account;
  membership: { organization_id: string; role: AccountRole };
  invitation: Invitation;
}> {
  const data = await apiRequest(
    `organizations/${encodeURIComponent(organizationId)}/users`,
    { token, method: 'POST', body: input, timeoutMs: 60000 },
  );

  if (
    !isRecord(data) ||
    !isRecord(data.membership) ||
    data.membership.organization_id !== organizationId ||
    !['admin', 'instructor', 'student'].includes(String(data.membership.role))
  ) {
    throw new Error('O serviço retornou um vínculo inválido.');
  }

  return {
    user: parseAccount(data.user),
    invitation: parseInvitation(data.invitation),
    membership: {
      organization_id: organizationId,
      role: data.membership.role as AccountRole,
    },
  };
}

export async function reissueInvitation(
  token: string,
  organizationId: string,
  userId: string,
): Promise<Invitation> {
  const data = await apiRequest(
    `organizations/${encodeURIComponent(organizationId)}/users/${encodeURIComponent(userId)}/invitation`,
    { token, method: 'POST', timeoutMs: 60000 },
  );
  if (!isRecord(data)) throw new Error('Resposta de convite inválida.');
  return parseInvitation(data.invitation);
}

export async function reissueInvitationByEmail(
  token: string,
  organizationId: string,
  email: string,
): Promise<Invitation> {
  const data = await apiRequest(
    `organizations/${encodeURIComponent(organizationId)}/invitations`,
    { token, method: 'POST', body: { email }, timeoutMs: 60000 },
  );
  if (!isRecord(data)) throw new Error('Resposta de convite inválida.');
  return parseInvitation(data.invitation);
}

export async function acceptInvitation(
  token: string,
  password: string,
): Promise<void> {
  await apiRequest('invitations/accept', {
    method: 'POST',
    body: { token, password },
  });
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await apiRequest('me/password', {
    token,
    method: 'PATCH',
    body: { currentPassword, newPassword },
  });
}

export async function logout(token: string): Promise<void> {
  await apiRequest('sessions/current', { token, method: 'DELETE' });
}
