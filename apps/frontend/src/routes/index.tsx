import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, Building2, ShieldCheck, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { useAuth } from '@/lib/auth-context.ts';

export const Route = createFileRoute('/')({ component: HomePage });

function HomePage() {
  const { session, loading } = useAuth();

  return (
    <section className="page-enter">
      <div className="hero-grid">
        <div>
          <p className="eyebrow">
            <span /> PROJECT GYM · BEM-VINDO
          </p>
          <h1>
            Sua academia.
            <br />
            <span>Mais conectada.</span>
          </h1>
          <p className="hero-description">
            Acesse sua conta para acompanhar as redes e unidades disponíveis
            para você.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {!loading &&
              (session ? (
                <Button asChild size="lg">
                  <Link to="/organizations">
                    Ver minhas redes <ArrowRight size={16} />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg">
                  <Link to="/login">
                    Acessar minha conta <ArrowRight size={16} />
                  </Link>
                </Button>
              ))}
          </div>
        </div>
        <div className="architecture-card">
          <div className="architecture-top">
            <span>COMO FUNCIONA</span>
            <Building2 size={18} />
          </div>
          <div className="layer">
            <span className="layer-icon">
              <ShieldCheck size={22} />
            </span>
            <div>
              <strong>Administração da plataforma</strong>
              <p>Cria redes e indica os responsáveis por cada uma.</p>
            </div>
          </div>
          <div className="layer-line" />
          <div className="layer">
            <span className="layer-icon">
              <Building2 size={22} />
            </span>
            <div>
              <strong>Administração da rede</strong>
              <p>Gerencia as contas das pessoas que fazem parte da rede.</p>
            </div>
          </div>
          <div className="layer-line" />
          <div className="layer">
            <span className="layer-icon">
              <UsersRound size={22} />
            </span>
            <div>
              <strong>Alunos e instrutores</strong>
              <p>Recebem um convite para definir a senha e acessar a conta.</p>
            </div>
          </div>
          <div className="architecture-bottom">
            Uma conta pode participar de mais de uma rede.
          </div>
        </div>
      </div>
      <div className="section-heading">
        <span>PRIMEIRO ACESSO</span>
      </div>
      <div className="next-grid">
        <Card>
          <CardContent className="p-6">
            <span className="step-number">01</span>
            <h2>Recebeu um convite?</h2>
            <p>
              Abra o link recebido e defina sua própria senha para acessar sua
              conta.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <span className="step-number">02</span>
            <h2>Precisa de acesso?</h2>
            <p>
              Entre em contato com o administrador da sua academia para
              solicitar seu cadastro.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
