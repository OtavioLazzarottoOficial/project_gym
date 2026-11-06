import type { ConnectionCheckResponse } from '@repo/shared/connection-check';

export async function checkConnection(
  baseUrl: string = import.meta.env.VITE_API_URL,
): Promise<ConnectionCheckResponse> {
  let url: URL;

  try {
    url = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error('URL inválida');
    }
  } catch {
    throw new Error(
      'Configure VITE_API_URL com uma URL HTTP(S) válida no .env do frontend.',
    );
  }

  const response = await fetch(new URL('connection', url), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error('O backend respondeu com HTTP ' + response.status + '.');
  }

  const data: unknown = await response.json();

  if (
    typeof data !== 'object' ||
    data === null ||
    !('status' in data) ||
    data.status !== 'ok' ||
    !('service' in data) ||
    data.service !== 'backend' ||
    !('message' in data) ||
    typeof data.message !== 'string'
  ) {
    throw new Error('O backend retornou uma resposta inesperada.');
  }

  return { status: data.status, service: data.service, message: data.message };
}
