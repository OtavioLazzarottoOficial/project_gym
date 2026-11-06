import { useState, type FormEvent } from 'react';
import { ApiError, changePassword } from '@/lib/accounts-api.ts';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useAuth } from '@/lib/auth-context.ts';

export const Route = createFileRoute('/profile')({ component: ProfilePage });

function ProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { session, loading } = auth;
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError('');
    if (newPassword !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    if (
      Array.from(newPassword).length < 8 ||
      new TextEncoder().encode(newPassword).byteLength > 72 ||
      !/\p{Lu}/u.test(newPassword) ||
      !/\p{Ll}/u.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      setError(
        'Use pelo menos 8 caracteres, maiúscula, minúscula e número; no máximo 72 bytes.',
      );
      return;
    }
    setBusy(true);
    try {
      await changePassword(session.access_token, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      auth.passwordChanged();
      await navigate({ to: '/login' });
    } catch (failure) {
      if (failure instanceof ApiError && failure.status === 401) {
        auth.expire();
        return;
      }
      setError(
        failure instanceof ApiError && failure.status === 400
          ? 'Senha atual incorreta ou nova senha inválida.'
          : 'Não foi possível alterar a senha. Tente novamente.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p role="status">Verificando seu acesso…</p>;
  }

  if (!session) {
    return (
      <section className="gym-panel max-w-xl">
        <h1 className="page-title">Seu perfil</h1>
        <p className="mb-6 text-muted-foreground">
          Entre para consultar sua conta.
        </p>
        <Button asChild>
          <Link to="/login">Entrar</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="page-enter max-w-2xl">
      <p className="eyebrow">MINHA CONTA</p>
      <h1 className="page-title">Seu perfil</h1>
      <div className="gym-panel">
        <UserRound className="text-primary mb-6" size={30} />
        <dl className="space-y-6">
          <div>
            <dt className="text-xs text-muted-foreground">Nome</dt>
            <dd className="mt-2 font-medium break-words">
              {session.user.name}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="mt-2 break-all">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Perfil</dt>
            <dd className="mt-2">
              {session.user.is_platform_admin
                ? 'Administrador da plataforma'
                : 'Conta de academia · perfil definido por rede'}
            </dd>
          </div>
        </dl>
        <p className="gym-notice mt-8">
          Sua sessão termina em{' '}
          {new Date(session.expires_at).toLocaleString('pt-BR')}. Depois, será
          necessário entrar novamente.
        </p>
        <div className="mt-8 border-t pt-7">
          <h2 className="font-semibold">Alterar senha</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Ao alterar sua senha, você sairá de todas as suas sessões e
            precisará entrar novamente.
          </p>
          <form
            onSubmit={(event) => {
              void submit(event);
            }}
            className="mt-5 space-y-5"
          >
            <fieldset disabled={busy} className="space-y-5">
              <label className="gym-label" htmlFor="current-password">
                Senha atual
                <input
                  id="current-password"
                  className="gym-input"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label className="gym-label" htmlFor="new-password">
                Nova senha
                <input
                  id="new-password"
                  className="gym-input"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Pelo menos 8 caracteres, com maiúscula, minúscula e número; até
                72 bytes.
              </p>
              <label className="gym-label" htmlFor="confirm-password">
                Confirme a nova senha
                <input
                  id="confirm-password"
                  className="gym-input"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
              {error && (
                <p className="gym-error" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit">
                {busy ? 'Alterando…' : 'Alterar senha'}
              </Button>
            </fieldset>
          </form>
        </div>
      </div>
    </section>
  );
}
