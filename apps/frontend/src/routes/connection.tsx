import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.tsx';
import { checkConnection } from '@/lib/api.ts';

export const Route = createFileRoute('/connection')({
  component: ConnectionPage,
});

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'success' | 'error'; message: string };

function ConnectionPage() {
  const [state, setState] = useState<State>({ status: 'idle' });

  async function testConnection() {
    setState({ status: 'loading' });
    try {
      const result = await checkConnection();
      setState({ status: 'success', message: result.message });
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'TimeoutError'
          ? 'O backend demorou para responder. Tente novamente.'
          : error instanceof TypeError
            ? 'Não foi possível alcançar o backend. Confira se ele está em execução e se a origem está permitida no CORS.'
            : error instanceof Error
              ? error.message
              : 'Não foi possível testar a conexão.';
      setState({ status: 'error', message });
    }
  }

  return (
    <section className="max-w-2xl space-y-8">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Diagnóstico
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          Teste de conexão
        </h1>
        <p className="text-muted-foreground">
          Confira se esta aplicação consegue enviar uma chamada e receber a
          resposta da API.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Frontend ↔ Backend</CardTitle>
          <CardDescription className="break-all">
            API: {import.meta.env.VITE_API_URL || 'não configurada'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button
            disabled={state.status === 'loading'}
            onClick={() => {
              void testConnection();
            }}
          >
            {state.status === 'loading' ? 'Testando…' : 'Testar conexão'}
          </Button>
          <div
            aria-live="polite"
            role={state.status === 'error' ? 'alert' : 'status'}
            className="text-sm"
          >
            {state.status === 'idle' && (
              <p className="text-muted-foreground">Pronto para testar.</p>
            )}
            {state.status === 'loading' && (
              <p className="text-muted-foreground">
                Aguardando resposta do backend…
              </p>
            )}
            {state.status === 'success' && (
              <p className="text-green-700 dark:text-green-400">
                <strong>Conexão funcionando.</strong> {state.message}
              </p>
            )}
            {state.status === 'error' && (
              <p className="text-destructive">
                <strong>Falha na conexão.</strong> {state.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
