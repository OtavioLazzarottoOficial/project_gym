import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkConnection } from './api.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chamada de conexão', () => {
  it('chama a URL configurada e interpreta o contrato', async () => {
    const body = { status: 'ok', service: 'backend', message: 'Conectado' };
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(body)));
    vi.stubGlobal('fetch', fetchSpy);

    await expect(checkConnection('http://localhost:3000')).resolves.toEqual(
      body,
    );

    expect(String(fetchSpy.mock.calls[0][0])).toBe(
      'http://localhost:3000/connection',
    );
  });

  it('recusa configuração inválida antes de enviar a chamada', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(checkConnection('invalid')).rejects.toThrow('VITE_API_URL');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('informa erros HTTP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 503 })),
    );

    await expect(checkConnection('http://localhost:3000')).rejects.toThrow(
      'HTTP 503',
    );
  });

  it('recusa um contrato inesperado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"status":"unknown"}')),
    );

    await expect(checkConnection('http://localhost:3000')).rejects.toThrow(
      'resposta inesperada',
    );
  });

  it('propaga falhas de rede para a interface', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(checkConnection('http://localhost:3000')).rejects.toThrow(
      'Failed to fetch',
    );
  });
});
