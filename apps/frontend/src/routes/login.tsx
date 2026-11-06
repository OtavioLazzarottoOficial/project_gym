import { useState, type FormEvent } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useAuth } from '@/lib/auth-context.ts';

export const Route = createFileRoute('/login')({ component: LoginPage });

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      await auth.signIn(email, password);
      setPassword('');
      await navigate({
        to: '/organizations',
      });
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Não foi possível entrar.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (auth.loading) {
    return <p role="status">Verificando seu acesso…</p>;
  }

  if (auth.session) {
    return (
      <section className="gym-panel max-w-xl">
        <p className="eyebrow">ACESSO CONFIRMADO</p>
        <h1 className="page-title">Olá, {auth.session.user.name}.</h1>
        <Button asChild>
          <Link to={'/organizations'}>
            Continuar <ArrowRight />
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="auth-grid page-enter">
      <aside className="auth-aside">
        <ShieldCheck size={38} strokeWidth={1.4} />
        <p className="eyebrow mt-10">SUA ACADEMIA, CONECTADA</p>
        <h1>
          Seu próximo
          <br />
          passo começa
          <br />
          <span>por aqui.</span>
        </h1>
        <p>
          Acesse sua conta para cuidar do que importa: pessoas, movimento e
          evolução.
        </p>
        <div className="auth-aside-foot">PROJECT GYM · ACESSO À CONTA</div>
      </aside>
      <div className="gym-panel login-panel">
        <p className="eyebrow">BEM-VINDO DE VOLTA</p>
        <h2 className="text-3xl font-semibold tracking-tight mt-4">
          Entre na sua conta
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Use o email e a senha cadastrados na academia.
        </p>
        {auth.notice && (
          <p className="gym-notice mt-6" role="status">
            {auth.notice}
          </p>
        )}
        <form
          onSubmit={(event) => {
            void submit(event);
          }}
          className="mt-8 space-y-5"
        >
          <fieldset disabled={busy} className="space-y-5">
            <label className="gym-label" htmlFor="login-email">
              Email
              <input
                id="login-email"
                className="gym-input"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@academia.com"
              />
            </label>
            <div>
              <label className="gym-label" htmlFor="login-password">
                Senha
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  className="gym-input pr-12"
                  type={visible ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  className="absolute right-3 top-3 text-muted-foreground"
                  type="button"
                  aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <p className="gym-error" role="alert">
                {error}
              </p>
            )}
            <Button className="w-full h-11" type="submit">
              {busy ? 'Entrando…' : 'Entrar'}{' '}
              {!busy && <ArrowRight size={16} />}
            </Button>
          </fieldset>
        </form>
        <p className="mt-7 text-xs leading-6 text-muted-foreground">
          Ainda não tem uma conta? Solicite seu cadastro ao administrador da
          academia.
        </p>
      </div>
    </section>
  );
}
