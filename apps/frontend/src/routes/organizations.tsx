import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useAuth, roleLabels } from '@/lib/auth-context.ts';
import {
  createNetwork,
  listNetworks,
  type Network,
} from '@/lib/organizations-api.ts';

export const Route = createFileRoute('/organizations')({
  component: NetworksPage,
});

function NetworksPage() {
  const auth = useAuth();
  const token = auth.session?.access_token;
  const [networks, setNetworks] = useState<Network[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loadedFor, setLoadedFor] = useState('');
  const requestKey = token ?? '';
  const loading = loadedFor !== requestKey;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      return;
    }
    void listNetworks(token)
      .then((items) => {
        if (active) setNetworks(items);
      })
      .catch((failure: unknown) => {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Não foi possível consultar as redes.',
          );
      })
      .finally(() => {
        if (active) setLoadedFor(requestKey);
      });
    return () => {
      active = false;
    };
  }, [token, requestKey]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const network = await createNetwork(token, name);
      setNetworks((current) => [...current, network]);
      setName('');
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Não foi possível cadastrar a rede.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (auth.loading) return <p role="status">Verificando seu acesso…</p>;
  if (!auth.session)
    return (
      <div className="gym-panel">
        <h1 className="page-title">Entre para acessar suas redes</h1>
        <Button asChild>
          <Link to="/login">Entrar</Link>
        </Button>
      </div>
    );

  return (
    <section className="page-enter">
      <p className="eyebrow">
        {auth.session.user.is_platform_admin
          ? 'ADMINISTRAÇÃO DA PLATAFORMA'
          : 'MINHAS ACADEMIAS'}
      </p>
      <h1 className="page-title">Redes de academias</h1>
      <p className="text-muted-foreground mb-8">
        Uma rede reúne as unidades da mesma academia. Escolha uma rede para
        consultar as unidades ou gerenciar as contas disponíveis para seu
        perfil.
      </p>
      {error && (
        <p className="gym-error mb-6" role="alert">
          {error}
        </p>
      )}
      {auth.session.user.is_platform_admin && (
        <form
          onSubmit={(event) => {
            void submit(event);
          }}
          className="gym-panel mb-8 flex flex-wrap items-end gap-4"
        >
          <label className="gym-label grow" htmlFor="network-name">
            Nome da rede
            <input
              className="gym-input"
              id="network-name"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Rede Movimento"
            />
          </label>
          <Button className="mb-2 h-11" disabled={busy}>
            {busy ? 'Cadastrando…' : 'Cadastrar rede'}
          </Button>
        </form>
      )}
      {loading ? (
        <p role="status">Carregando redes…</p>
      ) : networks.length === 0 ? (
        <p className="gym-notice">
          {auth.session.user.is_platform_admin
            ? 'Cadastre a primeira rede para começar.'
            : 'Sua conta ainda não está vinculada a uma rede. Procure o administrador da academia.'}
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {networks.map((network) => (
            <article key={network.id} className="gym-panel">
              <Building2 className="text-primary mb-4" />
              <h2 className="text-xl font-semibold">{network.name}</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {network.role
                  ? `Seu perfil nesta rede: ${roleLabels[network.role]}`
                  : 'Administrador da plataforma · ainda sem perfil nesta rede'}
              </p>
              {auth.session!.user.is_platform_admin &&
                network.role !== 'admin' && (
                  <p className="gym-notice mt-4">
                    Como administrador da plataforma, você pode cadastrar o
                    responsável pela rede. Para cadastrar alunos e instrutores,
                    sua conta precisa ter o perfil de administrador nesta rede.
                  </p>
                )}
              <div className="mt-6 flex flex-wrap gap-3">
                {(network.role === 'admin' ||
                  network.role === 'instructor') && (
                  <Button asChild variant="outline">
                    <Link
                      to="/students"
                      search={{ organizationId: network.id }}
                    >
                      Ver alunos
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline">
                  <Link to="/units" search={{ organizationId: network.id }}>
                    Ver unidades <ArrowRight size={14} />
                  </Link>
                </Button>
                {(auth.session!.user.is_platform_admin ||
                  network.role === 'admin') && (
                  <Button asChild>
                    <Link to="/users" search={{ organizationId: network.id }}>
                      {auth.session!.user.is_platform_admin &&
                      network.role !== 'admin'
                        ? 'Definir administrador'
                        : 'Cadastrar conta'}
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
