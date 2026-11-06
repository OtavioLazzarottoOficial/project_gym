# Project Gym

Monorepo npm workspaces/Turborepo com backend NestJS/DDD, frontend React/Vite/shadcn/TanStack Router e packages/shared. Requer Node.js 24.15+ e Docker para PostgreSQL.

## Começar em outro computador

Instale o **Node.js 24.15 ou superior**, o **Git** e o **Docker Desktop** com Docker Compose. Abra o Docker Desktop e aguarde ele iniciar. Em um terminal, execute:

```powershell
git clone https://github.com/OtavioLazzarottoOficial/project_gym.git
cd project_gym
npm run setup
```

O setup instala as dependências com o lockfile, cria os arquivos de ambiente locais se estiverem ausentes, gera chaves próprias para o backend, inicia o PostgreSQL local, aplica as migrations e prepara o pacote compartilhado. Ele preserva arquivos `.env` existentes e o volume do banco. Por segurança, não aplica migrations automaticamente se a conexão estiver configurada para outro banco.

Na primeira utilização de um banco vazio, crie o administrador da plataforma no terminal interativo:

```powershell
npm run admin:setup --workspace @repo/backend
```

Informe nome, email e senha quando solicitado. Esse comando só cria o primeiro administrador; se já existir um, pule esta etapa. Depois inicie o projeto:

```powershell
npm run dev
```

Acesse o frontend em http://localhost:5173 e entre com a conta criada. A API fica em http://localhost:3000; a rota `/connection` é um diagnóstico público. Para parar os processos, use Ctrl+C. O comando `npm run db:stop` para o banco sem apagar seu volume.

O arquivo `apps/backend/.env` é criado com o banco local e novas chaves de autenticação. Para enviar convites, preencha nele as configurações SMTP de sua conta de teste; não use a senha normal do Gmail. O arquivo `apps/frontend/.env` também é criado a partir do exemplo. Os dois são locais e não vão para o Git.

Cada computador tem seu próprio banco e volume Docker. Clonar o código **não transfere os alunos, contas ou demais dados** cadastrados no outro computador; para reutilizá-los, é necessário um procedimento de backup e restauração separado.

## Organização

- apps/backend: core, domínio/aplicação e infraestrutura NestJS, Prisma 7, JWT RS256, bcryptjs, throttler e validação de ambiente Zod.
- apps/frontend: React, TypeScript, Vite, Tailwind, shadcn/ui e TanStack Router com rotas geradas.
- packages/shared: contratos independentes de framework, compilados antes das apps.

O projeto possui login, contas, redes e unidades; os demais módulos seguem o plano de implementação.

## Comandos

`npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` e `npm run format`. Testes usam somente Vitest; o backend usa SWC para preservar os metadados dos decorators.

Imports relativos autorais usam .ts/.tsx; o build do backend/shared reescreve as extensões para .js no ESM. Não edite código gerado do Prisma nem routeTree.gen.ts. Use apenas o lockfile da raiz.

## Ambiente e desenvolvimento

Cada backend recebe chaves RSA locais exclusivas. Não versione .env nem copie chaves de outro projeto. As variáveis VITE_* são públicas. O frontend usa VITE_API_URL; a API permite a origem definida por CORS_ORIGINS. Shared é compilado antes do dev; ao alterá-lo, faça rebuild e reinicie o dev para refletir as mudanças.

Para hospedar o frontend como SPA, configure fallback para index.html e VITE_API_URL/CORS para os domínios reais. Não há publicação configurada.

## Contexto e planejamento do negócio

O Project Gym atende redes de academias com administrador de plataforma, administradores de rede, instrutores e alunos. Contas, login, redes, unidades e convites estão implementados. O cadastro específico de alunos está disponível no backend; consulta de alunos, planos, matrículas e controle financeiro manual seguem planejados.

- [Definição do projeto: contexto, requisitos, regras e critérios de aceitação](docs/project-definition.md).
- [Plano de implementação e acompanhamento das tarefas](docs/implementation-plan.md).

Consulte esses documentos antes de iniciar novos ciclos. Reaproveite decisões confirmadas e esclareça as questões em aberto que afetem a operação solicitada.

## Persistência de contas

A migration de usuários está em apps/backend/prisma/migrations. Para aplicar migrations pendentes no banco de desenvolvimento configurado, execute `npm run prisma:deploy --workspace @repo/backend`.

Execute `npm run test:integration --workspace @repo/backend` para testar os repositórios com PostgreSQL real. O teste exige o banco local do projeto em localhost:5433/base_local, aplica migrations em um schema temporário exclusivo e remove esse schema ao terminar. Não usa contas do schema público. Testes unitários continuam em `npm test --workspace @repo/backend`.

O cadastro possui `POST /organizations/:organizationId/users`, protegido por JWT e sessão persistida e restrito a administrador. Autenticação: `POST /sessions`, `DELETE /sessions/current` e `GET /me`. Frontend: `/login`, `/organizations`, `/units`, `/users` e `/profile`. Consulte [cadastro HTTP](docs/http-users.md) e [autenticação, primeiro administrador e limites](docs/http-authentication.md).

## Uso inicial

Entre como administrador da plataforma para cadastrar uma rede e indicar o administrador responsável. O administrador da rede pode cadastrar contas de alunos, instrutores e outros administradores. Cada conta pode ter perfil diferente em cada rede.

Alunos e instrutores recebem convite por email para definir a senha; para administradores adicionais, o link é entregue diretamente. Se o envio de email falhar, a conta fica pendente e o convite pode ser reenviado. A sessão dura 8 horas; sair revoga a sessão atual e trocar a senha revoga todas as sessões.

A migration anterior preserva os perfis legados sem conceder acesso automaticamente. Redes diferentes têm seus próprios vínculos e permissões.
