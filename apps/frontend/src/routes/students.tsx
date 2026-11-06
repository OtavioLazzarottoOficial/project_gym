import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useAuth } from '@/lib/auth-context.ts';
import { ApiError } from '@/lib/accounts-api.ts';
import {
  listNetworks,
  listUnits,
  type Network,
  type Unit,
} from '@/lib/organizations-api.ts';
import {
  listStudents,
  registerStudent,
  type Contact,
  type Student,
  type StudentPage,
} from '@/lib/students-api.ts';

export const Route = createFileRoute('/students')({
  validateSearch: (search: Record<string, unknown>) => ({
    organizationId:
      typeof search.organizationId === 'string' ? search.organizationId : '',
  }),
  component: StudentsPage,
});

function StudentsPage() {
  const auth = useAuth();
  const token = auth.session?.access_token;
  const search = Route.useSearch();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [organizationId, setOrganizationId] = useState(search.organizationId);
  const [units, setUnits] = useState<Unit[]>([]);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<StudentPage | null>(null);
  const [resultKey, setResultKey] = useState('');
  const [selected, setSelected] = useState<Student | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [networksLoaded, setNetworksLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [includeAddress, setIncludeAddress] = useState(false);
  const [includeEmergency, setIncludeEmergency] = useState(false);
  const [includeGuardian, setIncludeGuardian] = useState(false);
  const available = networks.filter(
    (network) => network.role === 'admin' || network.role === 'instructor',
  );
  const network = available.find((item) => item.id === organizationId);
  const admin = network?.role === 'admin';
  const visibleResult =
    resultKey === `${organizationId}:${page}` ? result : null;

  useEffect(() => {
    if (selected) detailsRef.current?.focus();
  }, [selected]);

  useEffect(() => {
    let active = true;
    if (!token) return;
    void listNetworks(token)
      .then((items) => {
        if (!active) return;
        setNetworks(items);
        const allowed = items.filter(
          (item) => item.role === 'admin' || item.role === 'instructor',
        );
        setOrganizationId((current) =>
          allowed.some((item) => item.id === current)
            ? current
            : (allowed[0]?.id ?? ''),
        );
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Não foi possível carregar as redes.',
          );
      })
      .finally(() => {
        if (active) setNetworksLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    let active = true;
    if (!token || !network) return;
    setLoading(true);
    setResult(null);
    void listStudents(token, network.id, page)
      .then((data) => {
        if (active) {
          setResult(data);
          setResultKey(`${network.id}:${page}`);
        }
      })
      .catch((failure: unknown) => {
        if (!active) return;
        if (failure instanceof ApiError && failure.status === 401)
          auth.expire();
        setError(
          failure instanceof Error
            ? failure.message
            : 'Não foi possível consultar os alunos.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, network?.id, page, refresh]);

  useEffect(() => {
    let active = true;
    setUnits([]);
    if (!token || !network) return;
    setUnitsLoading(true);
    void listUnits(token, network.id)
      .then((items) => {
        if (active) setUnits(items);
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Não foi possível carregar as unidades.',
          );
      })
      .finally(() => {
        if (active) setUnitsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, network?.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !network || !admin) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? '').trim();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const birthDate = value('birthDate');
    const age =
      Number(today.slice(0, 4)) -
      Number(birthDate.slice(0, 4)) -
      (today.slice(5) < birthDate.slice(5) ? 1 : 0);
    if (birthDate && age < 18 && !includeGuardian) {
      setError(
        'Alunos menores de 18 anos precisam de um responsável. Marque a opção e preencha os dados.',
      );
      return;
    }
    const contact = (prefix: string): Contact => ({
      name: value(`${prefix}Name`),
      phone: value(`${prefix}Phone`),
      relationship: value(`${prefix}Relationship`),
    });
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await registerStudent(token, network.id, {
        branchId: value('branchId'),
        name: value('name'),
        email: value('email'),
        cpf: value('cpf'),
        phone: value('phone'),
        birthDate: value('birthDate'),
        ...(includeAddress
          ? {
              address: {
                postalCode: value('postalCode'),
                street: value('street'),
                number: value('number'),
                neighborhood: value('neighborhood'),
                city: value('city'),
                state: value('state'),
                ...(value('complement')
                  ? { complement: value('complement') }
                  : {}),
              },
            }
          : {}),
        ...(includeEmergency ? { emergencyContact: contact('emergency') } : {}),
        ...(includeGuardian ? { guardian: contact('guardian') } : {}),
      });
      form.reset();
      setIncludeAddress(false);
      setIncludeEmergency(false);
      setIncludeGuardian(false);
      setShowForm(false);
      setSelected(null);
      setPage(1);
      setRefresh((v) => v + 1);
      setNotice(
        response.status === 'sent'
          ? 'Aluno cadastrado. O convite para definir a senha foi enviado por email.'
          : response.status === 'delivery_failed'
            ? 'Aluno cadastrado, mas o email não foi enviado. Reenvie o convite na tela de contas.'
            : 'Aluno cadastrado. A conta existente mantém sua senha.',
      );
      void listNetworks(token)
        .then(setNetworks)
        .catch(() =>
          setError(
            'Aluno cadastrado, mas não foi possível atualizar suas permissões. Recarregue a página.',
          ),
        );
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) auth.expire();
      setError(
        failure instanceof Error
          ? failure.message
          : 'Não foi possível cadastrar o aluno.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (auth.loading) return <p role="status">Verificando seu acesso…</p>;
  if (!auth.session)
    return (
      <section className="gym-panel">
        <h1 className="page-title">Entre para consultar alunos</h1>
        <Button asChild>
          <Link to="/login">Ir para o login</Link>
        </Button>
      </section>
    );
  if (!networksLoaded) return <p role="status">Carregando redes…</p>;

  return (
    <section className="page-enter space-y-6">
      <div>
        <p className="eyebrow">GESTÃO DE ALUNOS</p>
        <h1 className="page-title">Alunos da academia</h1>
        <p className="text-muted-foreground max-w-2xl">
          Consulte os cadastros da sua rede. O cadastro do aluno pode ser feito
          antes da matrícula.
        </p>
      </div>
      {error && (
        <p className="gym-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <div className="gym-notice" role="status">
          {notice}{' '}
          {notice.includes('não foi enviado') && (
            <Link to="/users" search={{ organizationId }} className="underline">
              Ir para contas
            </Link>
          )}
        </div>
      )}
      {available.length === 0 ? (
        <div className="gym-panel">
          <p>
            Para consultar alunos, sua conta precisa ser administradora ou
            instrutora de uma rede.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/organizations">Ver redes</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="gym-panel flex flex-wrap items-end gap-4">
            <label className="gym-label grow" htmlFor="student-network">
              Rede de academias
              <select
                id="student-network"
                className="gym-input"
                value={organizationId}
                disabled={busy}
                onChange={(event) => {
                  setOrganizationId(event.target.value);
                  setPage(1);
                  setSelected(null);
                  setShowForm(false);
                  setError('');
                  setNotice('');
                }}
              >
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            {admin && (
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  setShowForm((v) => !v);
                  setError('');
                }}
              >
                {showForm ? 'Fechar cadastro' : 'Cadastrar aluno'}{' '}
                <UserPlus size={16} />
              </Button>
            )}
          </div>
          {showForm && admin && (
            <form
              className="gym-panel space-y-5"
              onSubmit={(event) => {
                void submit(event);
              }}
            >
              <div>
                <h2 className="text-xl font-semibold">Cadastrar aluno</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Dados obrigatórios para o cadastro. Para menores de 18 anos,
                  informe também o responsável.
                </p>
              </div>
              <p className="gym-notice">
                Se a conta já for administradora ou instrutora nesta rede, o
                perfil será alterado para aluno ao concluir o cadastro. Os
                vínculos em outras redes não serão alterados.
              </p>
              <fieldset disabled={busy || unitsLoading} className="space-y-5">
                {units.length === 0 ? (
                  <p className="gym-notice">
                    {unitsLoading
                      ? 'Carregando unidades…'
                      : 'Cadastre uma unidade nesta rede antes de cadastrar alunos.'}{' '}
                    <Link
                      to="/units"
                      search={{ organizationId }}
                      className="underline"
                    >
                      Ver unidades
                    </Link>
                  </p>
                ) : (
                  <label className="gym-label">
                    Unidade principal
                    <select
                      name="branchId"
                      className="gym-input"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecione uma unidade
                      </option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} · {unit.city}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="grid gap-x-5 md:grid-cols-2">
                  <Field
                    name="name"
                    label="Nome completo"
                    required
                    maxLength={120}
                  />
                  <Field name="email" label="Email" type="email" required />
                  <Field name="cpf" label="CPF" required />
                  <Field
                    name="phone"
                    label="Telefone com DDD"
                    type="tel"
                    required
                  />
                  <Field
                    name="birthDate"
                    label="Data de nascimento"
                    type="date"
                    required
                  />
                </div>
                <Optional
                  title="Endereço"
                  checked={includeAddress}
                  onChange={setIncludeAddress}
                >
                  <div className="grid gap-x-5 md:grid-cols-2">
                    <Field name="postalCode" label="CEP" required />
                    <Field name="street" label="Rua" required />
                    <Field name="number" label="Número" required />
                    <Field name="complement" label="Complemento" />
                    <Field name="neighborhood" label="Bairro" required />
                    <Field name="city" label="Cidade" required />
                    <Field
                      name="state"
                      label="Estado (UF)"
                      required
                      maxLength={2}
                    />
                  </div>
                </Optional>
                <Optional
                  title="Contato de emergência"
                  checked={includeEmergency}
                  onChange={setIncludeEmergency}
                >
                  <ContactFields prefix="emergency" />
                </Optional>
                <Optional
                  title="Responsável"
                  checked={includeGuardian}
                  onChange={setIncludeGuardian}
                >
                  <ContactFields prefix="guardian" />
                </Optional>
                <Button type="submit" disabled={units.length === 0}>
                  {busy ? 'Cadastrando…' : 'Concluir cadastro'}
                </Button>
              </fieldset>
            </form>
          )}
          <div className="gym-panel">
            <div className="flex items-center gap-3 mb-5">
              <span className="gym-icon">
                <Users size={20} />
              </span>
              <div>
                <h2 className="font-semibold">Alunos cadastrados</h2>
                <p className="text-xs text-muted-foreground">
                  Selecione um aluno para ver seus dados.
                </p>
              </div>
            </div>
            {loading ? (
              <p role="status">Carregando alunos…</p>
            ) : visibleResult?.students.length === 0 ? (
              <p className="gym-notice">
                {page === 1
                  ? 'Ainda não há alunos cadastrados nesta rede.'
                  : 'Não há alunos nesta página.'}
              </p>
            ) : (
              <div className="space-y-2">
                {visibleResult?.students.map((student) => (
                  <button
                    type="button"
                    key={student.id}
                    className="w-full rounded-xl border border-border p-4 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
                    onClick={() => setSelected(student)}
                  >
                    <span className="font-semibold block">{student.name}</span>
                    <span className="text-sm text-muted-foreground break-all">
                      {student.email}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <Button
                type="button"
                variant="outline"
                disabled={page === 1 || loading}
                onClick={() => {
                  setSelected(null);
                  setPage((v) => v - 1);
                }}
              >
                Anterior
              </Button>
              <span className="text-sm" aria-live="polite">
                Página {page}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={loading || !visibleResult?.pagination.has_next_page}
                onClick={() => {
                  setSelected(null);
                  setPage((v) => v + 1);
                }}
              >
                Próxima
              </Button>
            </div>
          </div>
          {selected && (
            <div className="gym-panel space-y-4" ref={detailsRef} tabIndex={-1}>
              <div className="flex justify-between gap-4">
                <div>
                  <p className="eyebrow">DADOS DO ALUNO</p>
                  <h2 className="text-xl font-semibold">{selected.name}</h2>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setSelected(null)}
                >
                  Fechar
                </Button>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                <Detail label="Email" value={selected.email} />
                <Detail label="CPF" value={selected.cpf} />
                <Detail label="Telefone" value={selected.phone} />
                <Detail
                  label="Nascimento"
                  value={selected.birth_date.split('-').reverse().join('/')}
                />
                <Detail
                  label="Unidade principal"
                  value={
                    units.find((unit) => unit.id === selected.branch_id)
                      ?.name ?? selected.branch_id
                  }
                />
                <Detail
                  label="Endereço"
                  value={
                    selected.address
                      ? [
                          selected.address.street,
                          selected.address.number,
                          selected.address.complement,
                          selected.address.neighborhood,
                          selected.address.city,
                          selected.address.state,
                          selected.address.postalCode,
                        ]
                          .filter(Boolean)
                          .join(', ')
                      : 'Não informado'
                  }
                />
                <Detail
                  label="Contato de emergência"
                  value={contactText(selected.emergency_contact)}
                />
                <Detail
                  label="Responsável"
                  value={contactText(selected.guardian)}
                />
              </dl>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required = false,
  maxLength,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="gym-label">
      {label}
      <input
        className="gym-input"
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
      />
    </label>
  );
}
function ContactFields({ prefix }: { prefix: string }) {
  return (
    <div className="grid gap-x-5 md:grid-cols-2">
      <Field name={`${prefix}Name`} label="Nome" required />
      <Field
        name={`${prefix}Phone`}
        label="Telefone com DDD"
        type="tel"
        required
      />
      <Field
        name={`${prefix}Relationship`}
        label="Parentesco ou relação"
        required
      />
    </div>
  );
}
function Optional({
  title,
  checked,
  onChange,
  children,
}: {
  title: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t pt-4">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />{' '}
        Informar {title.toLowerCase()}
      </label>
      {checked && <div className="mt-3">{children}</div>}
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
function contactText(contact: Contact | null) {
  return contact
    ? `${contact.name} · ${contact.relationship} · ${contact.phone}`
    : 'Não informado';
}
