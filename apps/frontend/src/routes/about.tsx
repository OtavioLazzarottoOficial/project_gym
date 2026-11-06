import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Button } from '@/components/ui/button.tsx';

export const Route = createFileRoute('/about')({ component: AboutPage });

function AboutPage() {
  return (
    <section className="page-enter">
      <p className="eyebrow">SOBRE A BASE</p>
      <h1 className="page-title">
        Um lugar para
        <br />
        cada responsabilidade.
      </h1>
      <p className="max-w-xl text-muted-foreground">
        O Project Gym reúne as aplicações e os contratos compartilhados em um
        monorepo, com tarefas coordenadas pelo Turborepo.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {[
          {
            name: 'Frontend',
            path: 'apps/frontend',
            text: 'React, TypeScript, Vite, Tailwind, componentes shadcn/ui e rotas tipadas com TanStack Router.',
          },
          {
            name: 'Backend',
            path: 'apps/backend',
            text: 'NestJS com estrutura DDD, Prisma e PostgreSQL, ambiente validado e infraestrutura JWT RS256.',
          },
          {
            name: 'Shared',
            path: 'packages/shared',
            text: 'Contratos TypeScript independentes das aplicações. O diagnóstico de conexão é o primeiro contrato compartilhado.',
          },
        ].map((item) => (
          <Card key={item.path}>
            <CardContent className="p-6">
              <p className="font-mono text-xs text-primary">{item.path}</p>
              <h2 className="mt-5 text-xl font-semibold">{item.name}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {item.text}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-8 text-sm leading-7 text-muted-foreground">
        A página de conexão verifica a comunicação com a API. O domínio do
        sistema pode ser definido e ampliado a partir desta base.
      </p>
      <Button asChild className="mt-6">
        <Link to="/connection">
          Testar comunicação <ArrowRight size={16} />
        </Link>
      </Button>
    </section>
  );
}
