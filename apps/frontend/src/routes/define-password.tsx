import { useEffect, useState, type FormEvent } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import { acceptInvitation } from '@/lib/accounts-api.ts';

export const Route = createFileRoute('/define-password')({
  component: DefinePasswordPage,
});

function DefinePasswordPage() {
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '',
  );
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (window.location.hash)
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      );
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    if (
      Array.from(password).length < 8 ||
      new TextEncoder().encode(password).byteLength > 72 ||
      !/\p{Lu}/u.test(password) ||
      !/\p{Ll}/u.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setError(
        'Use pelo menos 8 caracteres, maiúscula, minúscula e número; no máximo 72 bytes.',
      );
      return;
    }
    setBusy(true);
    try {
      await acceptInvitation(token, password);
      setPassword('');
      setConfirmation('');
      setDone(true);
    } catch {
      setError(
        'Não foi possível definir a senha. Confira o link ou solicite um novo convite.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <section className="gym-panel max-w-xl">
        <h1 className="page-title">Senha definida</h1>
        <p className="mb-6">Agora você já pode entrar na sua conta.</p>
        <Button asChild>
          <Link to="/login">Ir para o login</Link>
        </Button>
      </section>
    );
  if (!token)
    return (
      <section className="gym-panel max-w-xl">
        <h1 className="page-title">Convite indisponível</h1>
        <p>Abra o link recebido ou peça um novo convite ao administrador.</p>
      </section>
    );

  return (
    <section className="gym-panel max-w-xl">
      <h1 className="page-title">Defina sua senha</h1>
      <p className="text-sm text-muted-foreground">
        Use pelo menos 8 caracteres, com maiúscula, minúscula e número. Limite
        de 72 bytes.
      </p>
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
        className="mt-8 space-y-5"
      >
        <fieldset disabled={busy} className="space-y-5">
          <label className="gym-label" htmlFor="new-password">
            Nova senha
            <input
              id="new-password"
              className="gym-input"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="gym-label" htmlFor="confirm-password">
            Confirme a senha
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
          <Button type="submit" className="w-full">
            {busy ? 'Salvando…' : 'Definir senha'}
          </Button>
        </fieldset>
      </form>
    </section>
  );
}
