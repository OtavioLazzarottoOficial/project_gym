import { useState } from 'react';
import { AuthProvider } from '@/lib/auth.tsx';
import { useAuth } from '@/lib/auth-context.ts';
import {
  createRootRoute,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/react-router';
import { Activity, ArrowUpRight, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => (
    <section className="py-20">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 text-4xl font-semibold">Página não encontrada</h1>
      <p className="mt-4 text-muted-foreground">
        Esse caminho ainda não existe no Project Gym.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </section>
  ),
});

function RootLayout() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

function MainLayout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    setBusy(true);
    setError('');

    try {
      await auth.signOut();
      await navigate({ to: '/login' });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Não foi possível sair.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-svh">
      <header className="site-header">
        <Link to="/" className="brand">
          <span>
            <Dumbbell size={21} />
          </span>
          project<span className="font-normal text-muted-foreground">gym</span>
        </Link>
        <nav aria-label="Navegação principal">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: 'active' }}
          >
            Início
          </Link>
          <Link to="/about" activeProps={{ className: 'active' }}>
            Sobre
          </Link>
          <Link to="/connection" activeProps={{ className: 'active' }}>
            Conexão <ArrowUpRight size={13} />
          </Link>
          {auth.session && (
            <Link
              to="/users"
              search={{ organizationId: '' }}
              activeProps={{ className: 'active' }}
            >
              Contas
            </Link>
          )}
          {auth.session && (
            <Link to="/profile" activeProps={{ className: 'active' }}>
              Meu perfil
            </Link>
          )}
          {auth.session && (
            <Link to="/organizations" activeProps={{ className: 'active' }}>
              Redes
            </Link>
          )}
        </nav>
        {auth.session ? (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              void signOut();
            }}
          >
            {busy ? 'Saindo…' : 'Sair'}
          </Button>
        ) : (
          <Button asChild>
            <Link to="/login">Entrar</Link>
          </Button>
        )}
        <div className="environment">
          <Activity size={13} /> Ambiente local
        </div>
      </header>
      <main className="site-main">
        {error && (
          <p role="alert" className="gym-error mb-6">
            {error}
          </p>
        )}
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>PROJECT GYM</span>
        <span>Um novo projeto. Um passo de cada vez.</span>
      </footer>
    </div>
  );
}
