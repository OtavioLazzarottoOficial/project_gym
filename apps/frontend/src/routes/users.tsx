import { listNetworks, type Network } from '@/lib/organizations-api.ts';
import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2, ShieldCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  ApiError,
  registerAccount,
  reissueInvitation,
  reissueInvitationByEmail,
  type Invitation,
  type AccountRole,
} from '@/lib/accounts-api.ts';
import { useAuth, roleLabels } from '@/lib/auth-context.ts';

export const Route = createFileRoute('/users')({
  validateSearch: (search: Record<string, unknown>) => ({
    organizationId:
      typeof search.organizationId === 'string' ? search.organizationId : '',
  }),
  component: UsersPage,
});

function UsersPage() {
  const auth = useAuth();
  const search = Route.useSearch();
  const token = auth.session?.access_token;
  const [networks, setNetworks] = useState<Network[]>([]);
  const [organizationId, setOrganizationId] = useState(search.organizationId);
  const [loadedFor, setLoadedFor] = useState('');
  const requestKey = token ? [token, search.organizationId].join(':') : '';
  const networksLoading = loadedFor !== requestKey;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [retryEmail, setRetryEmail] = useState('');
  const [retryResult, setRetryResult] = useState<Invitation | null>(null);
  const [retryError, setRetryError] = useState('');
  const [role, setRole] = useState<AccountRole>('student');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<Awaited<
    ReturnType<typeof registerAccount>
  > | null>(null);

  useEffect(() => {
    let active = true;
    if (!token) {
      return;
    }
    void listNetworks(token)
      .then((items) => {
        if (active) {
          setNetworks(items);
          setOrganizationId(
            (current) => search.organizationId || current || items[0]?.id || '',
          );
        }
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Não foi possível consultar suas redes.',
          );
      })
      .finally(() => {
        if (active) setLoadedFor(requestKey);
      });
    return () => {
      active = false;
    };
  }, [token, search.organizationId, requestKey]);
  const selectedNetwork = networks.find((item) => item.id === organizationId);
  const networkAdmin = selectedNetwork?.role === 'admin';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.session) {
      return;
    }

    setError('');
    setCreated(null);

    if (!name.trim() || Array.from(name).length > 120) {
      setError('Informe um nome preenchido com até 120 caracteres.');
      return;
    }

    setBusy(true);

    try {
      const account = await registerAccount(
        auth.session.access_token,
        organizationId,
        {
          name,
          email,
          role: networkAdmin ? role : 'admin',
        },
      );
      setCreated(account);

      if (
        account.user.id === auth.session.user.id &&
        account.membership.role === 'admin'
      ) {
        setNetworks((current) =>
          current.map((network) =>
            network.id === account.membership.organization_id
              ? { ...network, role: 'admin' }
              : network,
          ),
        );
      }

      setName('');
      setEmail('');
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        auth.expire();
      }

      setError(
        failure instanceof Error
          ? failure.message
          : 'Não foi possível cadastrar a conta.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!auth.session || !created) return;
    setBusy(true);
    setError('');
    try {
      const invitation = await reissueInvitation(
        auth.session.access_token,
        created.membership.organization_id,
        created.user.id,
      );
      setCreated({ ...created, invitation });
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) auth.expire();
      setError(
        failure instanceof Error
          ? failure.message
          : 'Não foi possível reenviar o convite.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendByEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth.session || !organizationId) return;
    setBusy(true);
    setRetryResult(null);
    setRetryError('');
    try {
      setRetryResult(
        await reissueInvitationByEmail(
          auth.session.access_token,
          organizationId,
          retryEmail,
        ),
      );
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) auth.expire();
      setRetryError(
        failure instanceof ApiError && failure.status === 404
          ? 'Conta não encontrada nesta rede.'
          : 'Não foi possível gerar um novo convite.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (auth.loading || networksLoading) {
    return <p role="status">Verificando seu acesso…</p>;
  }

  if (!auth.session) {
    return (
      <section className="gym-panel max-w-xl">
        <ShieldCheck className="text-primary" />
        <h1 className="page-title">Entre para continuar</h1>
        <p className="text-muted-foreground mb-6">
          O cadastro de contas está disponível para administradores da academia.
        </p>
        <Button asChild>
          <Link to="/login">Ir para o login</Link>
        </Button>
      </section>
    );
  }

  if (!auth.session.user.is_platform_admin && !networkAdmin) {
    return (
      <section className="gym-panel max-w-xl">
        <h1 className="page-title">Acesso administrativo</h1>
        <p className="text-muted-foreground mb-6">
          Seu perfil não permite cadastrar contas.
        </p>
        <Button asChild>
          <Link to="/organizations">Escolher outra rede</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="page-enter">
      <p className="eyebrow">
        <span /> GESTÃO DE ACESSOS
      </p>
      <h1 className="page-title">
        Uma nova pessoa.
        <br />
        <span className="text-primary">Um novo começo.</span>
      </h1>
      <p className="text-muted-foreground text-sm max-w-xl mb-9">
        Escolha a rede e informe os dados da pessoa. As opções de perfil
        dependem do seu acesso à rede selecionada.
      </p>
      <div className="accounts-grid">
        <div className="gym-panel">
          <div className="flex items-center gap-3 mb-7">
            <span className="gym-icon">
              <UserPlus size={20} />
            </span>
            <div>
              <h2 className="font-semibold">Cadastrar conta</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Preencha os dados de acesso.
              </p>
            </div>
          </div>
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            <fieldset disabled={busy || !selectedNetwork} className="space-y-5">
              <label className="gym-label" htmlFor="account-network">
                Rede de academias
                <select
                  className="gym-input"
                  id="account-network"
                  value={organizationId}
                  onChange={(event) => {
                    setOrganizationId(event.target.value);
                    setCreated(null);
                    setRetryResult(null);
                    setRetryError('');
                    setError('');
                  }}
                >
                  {networks.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.name}
                    </option>
                  ))}
                </select>
              </label>
              {auth.session.user.is_platform_admin && !networkAdmin && (
                <p className="gym-notice">
                  Você está acessando como administrador da plataforma, mas sua
                  conta não é administradora desta rede. Por isso, pode
                  cadastrar apenas o administrador responsável. Para cadastrar
                  alunos e instrutores, entre com uma conta administradora da
                  rede. Se sua conta ainda não estiver vinculada a esta rede,
                  você pode cadastrá-la aqui com seu próprio email e o perfil
                  Administrador. As opções de aluno e instrutor aparecerão assim
                  que o cadastro for concluído.
                </p>
              )}
              <label className="gym-label" htmlFor="account-name">
                Nome completo
                <input
                  id="account-name"
                  className="gym-input"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nome e sobrenome"
                />
                <span className="font-normal text-xs text-muted-foreground">
                  Até 120 caracteres.
                </span>
              </label>
              <label className="gym-label" htmlFor="account-email">
                Email
                <input
                  id="account-email"
                  className="gym-input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="pessoa@exemplo.com"
                />
              </label>
              <label className="gym-label" htmlFor="account-role">
                Perfil de acesso
                <select
                  id="account-role"
                  className="gym-input"
                  value={networkAdmin ? role : 'admin'}
                  onChange={(event) =>
                    setRole(event.target.value as AccountRole)
                  }
                >
                  {networkAdmin && <option value="student">Aluno</option>}
                  {networkAdmin && (
                    <option value="instructor">Instrutor</option>
                  )}
                  <option value="admin">Administrador</option>
                </select>
              </label>
              {error && (
                <p className="gym-error" role="alert">
                  {error}
                </p>
              )}
              <Button className="h-11 w-full" type="submit">
                {busy ? 'Cadastrando…' : 'Cadastrar conta'}{' '}
                <UserPlus size={16} />
              </Button>
            </fieldset>
          </form>
        </div>
        <aside className="space-y-5">
          <div className="gym-panel bg-[#edf1e8]">
            <ShieldCheck size={24} className="text-primary mb-4" />
            <h2 className="font-semibold">Sobre o primeiro acesso</h2>
            <p className="text-sm text-muted-foreground leading-7 mt-3">
              Alunos e instrutores recebem um link por email para definir a
              senha. Para administradores, entregue o link diretamente. O link
              vale por 24 horas e pode ser usado uma vez. Contas já existentes
              mantêm sua senha.
            </p>
          </div>
          <div className="gym-panel">
            <h2 className="font-semibold">Reenviar convite</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Informe o email da conta cadastrada na rede selecionada.
            </p>
            <form
              onSubmit={(event) => {
                void resendByEmail(event);
              }}
              className="space-y-4 mt-4"
            >
              <label className="gym-label" htmlFor="retry-email">
                Email
                <input
                  id="retry-email"
                  className="gym-input"
                  type="email"
                  required
                  value={retryEmail}
                  onChange={(event) => setRetryEmail(event.target.value)}
                />
              </label>
              <Button type="submit" disabled={busy || !selectedNetwork}>
                Gerar novo convite
              </Button>
            </form>
            {retryError && (
              <p className="gym-error mt-4" role="alert">
                {retryError}
              </p>
            )}
            {retryResult && (
              <div className="gym-notice mt-4" role="status">
                {retryResult.status === 'sent' && 'Convite enviado por email.'}
                {retryResult.status === 'delivery_failed' &&
                  'Não foi possível enviar o email. Tente novamente.'}
                {retryResult.status === 'already_active' &&
                  'Esta conta já possui senha e pode entrar.'}
                {retryResult.status === 'manual' && (
                  <>
                    <p>Entregue este link diretamente ao administrador:</p>
                    <p className="break-all mt-2">{retryResult.link}</p>
                  </>
                )}
              </div>
            )}
          </div>
          {created && (
            <div className="gym-panel border-green-700/25" role="status">
              <CheckCircle2 className="text-primary mb-4" />
              <h2 className="font-semibold">Conta vinculada à rede</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Nome</dt>
                  <dd className="mt-1 break-words">{created.user.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Email</dt>
                  <dd className="mt-1 break-all">{created.user.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Perfil</dt>
                  <dd className="mt-1">
                    {roleLabels[created.membership.role]}
                  </dd>
                </div>
              </dl>
              <div className="gym-notice mt-5 space-y-3">
                {created.invitation.status === 'already_active' && (
                  <p>Esta pessoa pode entrar com sua conta existente.</p>
                )}
                {created.invitation.status === 'sent' && (
                  <p>
                    Convite enviado por email. A conta aguarda a definição de
                    senha.
                  </p>
                )}
                {created.invitation.status === 'delivery_failed' && (
                  <p>
                    Conta criada, mas o email não pôde ser enviado. Reenvie o
                    convite.
                  </p>
                )}
                {created.invitation.status === 'manual' && (
                  <>
                    <p>Entregue este link diretamente ao novo administrador:</p>
                    <p className="break-all">{created.invitation.link}</p>
                  </>
                )}
                {created.invitation.status !== 'already_active' && (
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      void resend();
                    }}
                  >
                    Gerar novo convite
                  </Button>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
