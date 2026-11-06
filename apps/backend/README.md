# Backend base

Base NestJS/DDD com Prisma 7, PostgreSQL, Zod, JWT RS256, bcryptjs e throttler.
Não existem entidades de usuário, login HTTP ou modelos de negócio neste template.

## Preparar

O gerador cria .env a partir de .env.example e gera um par RSA exclusivo para o projeto.
Para recriar apenas um ambiente ausente, execute npm run env:init.
Não copie o .env ou as chaves de outro projeto.

Na pasta do Compose, execute docker compose up -d --wait db.
Na pasta do backend, instale dependências com npm install e inicie npm run start:dev.
Build, testes e desenvolvimento geram o cliente Prisma automaticamente.

## Padrões

O core é independente de framework. Os contratos de criptografia ficam em
domain/auth/application/crypthograpy e as implementações em infra/cryptography.
O pipe de validação está em infra/http/pipes/zod-validation-pipe.ts,
para validar os dados recebidos pelas rotas.

O guard JWT é global. / e /health exigem token RS256 com sub UUID válido.
Use Public para liberar explicitamente uma rota e CurrentUser para acessar o payload.
Não há endpoint de login: a emissão de tokens HTTP será uma funcionalidade própria.
O throttler global permite 100 requisições a cada 60 segundos.

EnvService fornece PORT, DATABASE_URL, CORS_ORIGINS e chaves JWT em base64.
O exemplo permite apenas http://localhost:5173. Ajuste a origem e as portas ao seu projeto.

## Verificar

npm run typecheck
npm run build
npm run lint
npm test
npm run test:e2e

Os testes HTTP substituem PrismaService e verificam rotas protegidas e públicas.
O schema Prisma está preparado sem modelos fictícios.


## Email de teste com Gmail

No arquivo `apps/backend/.env`, configure `SMTP_USER` com o endereço Gmail, `SMTP_PASS` com a senha de app e, opcionalmente, `SMTP_FROM` com o remetente (por padrão usa `SMTP_USER`). `SMTP_HOST=smtp.gmail.com` e `SMTP_PORT=465` usam TLS. `FRONTEND_URL` indica o endereço do frontend usado nos links de convite. Nunca coloque credenciais no `.env.example`.

A conta Google precisa de verificação em duas etapas para gerar uma senha de app; consulte https://support.google.com/accounts/answer/185833. Não use a senha normal do Gmail. O cadastro envia convite aos alunos e instrutores; para administradores, o link é apresentado para entrega direta.


## Testar a API com REST Client

Abra `apps/backend/requests.http` no VS Code com a extensão REST Client instalada e o backend local em execução. Clique em **Send Request** no bloco `login` e informe o email e a senha de uma conta de teste quando solicitado. Em seguida, execute os outros blocos autenticados: eles reutilizam o token da resposta de login. Para as rotas de rede, preencha `organizationId` no início do arquivo.

Os blocos indicam os perfis necessários e as operações que criam dados, enviam emails, consomem convites ou encerram sessões. Use contas e endereços de teste que você controla. As senhas são solicitadas pela extensão e não precisam ser gravadas no arquivo. Para definir a senha por convite, use o token do link de teste.
