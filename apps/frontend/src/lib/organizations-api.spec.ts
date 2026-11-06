import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUnit, listNetworks, listUnits } from './organizations-api.ts';

describe('Network-scoped API client', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('keeps each network role separate from platform access', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          organizations: [
            { id: 'a', name: 'Rede A', role: 'admin' },
            { id: 'b', name: 'Rede B', role: 'student' },
          ],
        }),
      ),
    );
    expect((await listNetworks('token')).map((item) => item.role)).toEqual([
      'admin',
      'student',
    ]);
  });

  it('always scopes unit requests to the selected network', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          branches: [
            {
              id: 'unit',
              organization_id: 'network-a',
              name: 'Centro',
              city: 'Tubarão',
            },
          ],
        }),
      ),
    );
    await listUnits('token', 'network-a');
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:3000/organizations/network-a/branches',
    );
    expect(fetchMock.mock.calls[0][1]?.headers).toHaveProperty(
      'Authorization',
      'Bearer token',
    );
  });

  it('rejects a unit from a different network instead of displaying it', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          branches: [
            {
              id: 'unit',
              organization_id: 'other-network',
              name: 'Wrong',
              city: 'Wrong',
            },
          ],
        }),
      ),
    );
    await expect(listUnits('token', 'network-a')).rejects.toThrow(
      'A unidade não pertence à rede selecionada.',
    );
  });

  it('does not send platform privileges or tenant IDs in a unit body', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          branch: {
            id: 'unit',
            organization_id: 'network-a',
            name: 'Centro',
            city: 'Tubarão',
          },
        }),
        { status: 201 },
      ),
    );
    await createUnit('token', 'network-a', 'Centro', 'Tubarão');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      name: 'Centro',
      city: 'Tubarão',
    });
  });
});
