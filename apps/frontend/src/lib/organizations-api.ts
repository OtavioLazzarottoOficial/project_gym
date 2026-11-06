import { apiRequest, type AccountRole } from './accounts-api.ts';

export interface Network {
  id: string;
  name: string;
  role: AccountRole | null;
}
export interface Unit {
  id: string;
  organization_id: string;
  name: string;
  city: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function network(value: unknown): Network {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !(
      value.role === null ||
      value.role === undefined ||
      ['admin', 'instructor', 'student'].includes(String(value.role))
    )
  ) {
    throw new Error('Dados de rede inválidos.');
  }
  return {
    id: value.id,
    name: value.name,
    role: (value.role as AccountRole | null) ?? null,
  };
}
function unit(value: unknown): Unit {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    typeof value.organization_id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.city !== 'string'
  ) {
    throw new Error('Dados de unidade inválidos.');
  }
  return {
    id: value.id,
    organization_id: value.organization_id,
    name: value.name,
    city: value.city,
  };
}
export async function listNetworks(token: string): Promise<Network[]> {
  const data = await apiRequest('organizations', { token });
  if (!record(data) || !Array.isArray(data.organizations)) {
    throw new Error('Lista de redes inválida.');
  }
  return data.organizations.map(network);
}
export async function createNetwork(
  token: string,
  name: string,
): Promise<Network> {
  const data = await apiRequest('organizations', {
    token,
    method: 'POST',
    body: { name },
  });
  return network(record(data) ? data.organization : null);
}
export async function listUnits(
  token: string,
  organizationId: string,
): Promise<Unit[]> {
  const data = await apiRequest(
    `organizations/${encodeURIComponent(organizationId)}/branches`,
    { token },
  );
  if (!record(data) || !Array.isArray(data.branches)) {
    throw new Error('Lista de unidades inválida.');
  }
  const units = data.branches.map(unit);
  if (units.some((item) => item.organization_id !== organizationId)) {
    throw new Error('A unidade não pertence à rede selecionada.');
  }
  return units;
}
export async function createUnit(
  token: string,
  organizationId: string,
  name: string,
  city: string,
): Promise<Unit> {
  const data = await apiRequest(
    `organizations/${encodeURIComponent(organizationId)}/branches`,
    { token, method: 'POST', body: { name, city } },
  );
  const result = unit(record(data) ? data.branch : null);
  if (result.organization_id !== organizationId) {
    throw new Error('A unidade não pertence à rede selecionada.');
  }
  return result;
}
