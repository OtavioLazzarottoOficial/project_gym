import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useAuth } from '@/lib/auth-context.ts';
import {
  listNetworks,
  listUnits,
  createUnit,
  type Unit,
} from '@/lib/organizations-api.ts';

export const Route = createFileRoute('/units')({
  validateSearch: (search: Record<string, unknown>) => ({
    organizationId:
      typeof search.organizationId === 'string' ? search.organizationId : '',
  }),
  component: UnitsPage,
});

function UnitsPage() {
  const auth = useAuth();
  const { organizationId } = Route.useSearch();
  const token = auth.session?.access_token;
  const [units, setUnits] = useState<Unit[]>([]);
  const [networkName, setNetworkName] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');
  const [loadedFor, setLoadedFor] = useState('');
  const requestKey = `${token}:${organizationId}`;
  const loading = loadedFor !== requestKey;
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (!token || !organizationId) {
      return;
    }
    void Promise.all([listUnits(token, organizationId), listNetworks(token)])
      .then(([items, networks]) => {
        if (!active) return;
        const network = networks.find((item) => item.id === organizationId);
        setUnits(items);
        setNetworkName(network?.name ?? '');
        setCanManage(network?.role === 'admin');
      })
      .catch((failure: unknown) => {
        if (active) {
          setUnits([]);
          setNetworkName('');
          setCanManage(false);
          setError(
            failure instanceof Error
              ? failure.message
              : 'Não foi possível consultar as unidades.',
          );
        }
      })
      .finally(() => {
        if (active) setLoadedFor(requestKey);
      });
    return () => {
      active = false;
    };
  }, [token, organizationId, requestKey]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      const unit = await createUnit(token, organizationId, name, city);
      setUnits((current) => [...current, unit]);
      setName('');
      setCity('');
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'Não foi possível cadastrar a unidade.',
      );
    } finally {
      setBusy(false);
    }
  }
  if (auth.loading) return <p role="status">Verificando seu acesso…</p>;
  if (!auth.session)
    return (
      <div className="gym-panel">
        <p>Entre para consultar unidades.</p>
        <Button asChild>
          <Link to="/login">Entrar</Link>
        </Button>
      </div>
    );
  if (!organizationId)
    return (
      <Button asChild>
        <Link to="/organizations">Escolher rede</Link>
      </Button>
    );
  return (
    <section className="page-enter">
      <Link to="/organizations" className="text-sm text-primary">
        ← Voltar às redes
      </Link>
      <p className="eyebrow mt-7">UNIDADES DA REDE</p>
      <h1 className="page-title">{networkName || 'Unidades'}</h1>
      <p className="text-muted-foreground mb-8">
        Seu vínculo com esta rede permite acessar suas unidades com a mesma
        conta.
      </p>
      {error && (
        <p role="alert" className="gym-error mb-6">
          {error}
        </p>
      )}
      {!loading && (canManage || auth.session.user.is_platform_admin) && (
        <form
          onSubmit={(event) => {
            void submit(event);
          }}
          className="gym-panel mb-7 grid gap-4 md:grid-cols-3"
        >
          <label className="gym-label" htmlFor="unit-name">
            Nome da unidade
            <input
              className="gym-input"
              id="unit-name"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="gym-label" htmlFor="unit-city">
            Cidade
            <input
              className="gym-input"
              id="unit-city"
              required
              maxLength={120}
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>
          <Button className="mt-7 h-11" disabled={busy}>
            {busy ? 'Cadastrando…' : 'Cadastrar unidade'}
          </Button>
        </form>
      )}
      {loading ? (
        <p role="status">Carregando unidades…</p>
      ) : units.length === 0 ? (
        <p className="gym-notice">
          Esta rede ainda não possui unidades cadastradas.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {units.map((unit) => (
            <article className="gym-panel" key={unit.id}>
              <MapPin className="text-primary mb-4" />
              <h2 className="font-semibold text-xl">{unit.name}</h2>
              <p className="text-muted-foreground mt-2">{unit.city}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
