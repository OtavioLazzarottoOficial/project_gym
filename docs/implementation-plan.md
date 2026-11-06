# Plano de implementação — Project Gym

Atualizado em 05/11/2026. Definição: [contexto, requisitos e regras](project-definition.md).

## Próxima entrega

Contas de acesso e login para administrador, instrutores e alunos. O administrador cadastra instrutores, alunos e outros administradores; a conta usa nome, email único, senha e um perfil. Instrutores e alunos definem a senha por convite enviado por email. A troca voluntária no perfil exige senha atual e nova senha. Nome obrigatório com até 120 caracteres e email válido normalizado em minúsculas, removendo espaços nas pontas. A sessão dura 8 horas desde o login e não tem renovação automática. Administrador acessa o cadastro de contas; todos os perfis acessam o próprio perfil e a troca da própria senha. Sair encerra a sessão atual; trocar a senha encerra todas as sessões. Falha no envio do convite mantém a conta pendente e permite reenvio, informando o administrador. O comando inicial recusa execução quando já existe administrador. Administradores adicionais definem a senha no navegador por link entregue diretamente pelo administrador que cadastrou a conta; validade de 24 horas, uso único e invalidação do anterior ao gerar outro. O envio de email começa com teste local; serviço/remetente de produção ficam adiados e não bloqueiam essa etapa.

## Tarefas em ordem de implementação

| ID    | Objetivo                                                               | Referências                                                                                                                                                      | Depende de         | Situação     | Condição de conclusão                                                                                                                                                                                                                                                                                                                                                                     |
| ----- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-001 | Preparar a base fullstack e validar comunicação entre apps             | Infraestrutura registrada no estado atual                                                                                                                        | —                  | Concluída    | Base entregue; build/tipos/lint e 23 testes registrados na criação, diagnóstico/CORS e health PostgreSQL verificados naquela etapa                                                                                                                                                                                                                                                        |
| T-002 | Registrar a definição inicial e a primeira entrega                     | D-001 a D-006, RF-001/RF-002                                                                                                                                     | T-001              | Concluída    | Respostas registradas, documentos vinculados ao README e questões pendentes explícitas; não significa especificação completa                                                                                                                                                                                                                                                              |
| T-003 | Fechar as decisões de negócio da primeira entrega local                | D-007 a D-022, RF-001 a RF-008, RN-001 a RN-016, Q-010 resolvida, RNF-002/RNF-003                                                                                | T-002              | Concluída    | Respostas registradas com critérios observáveis; acesso inicial de administrador adicional por link entregue diretamente com 24 horas, uso único e invalidação no reenvio. Email de teste local confirmado; Q-006/Q-007 adiadas e RNF-001 segue como proposta técnica, sem bloquear o início do domínio                                                                                   |
| T-004 | Implementar domínio/aplicação de contas e testes                       | RF-001, RN-001 a RN-005/RN-008/RN-010, CA-001 a CA-004/CA-013/CA-014, normalização reutilizável de CA-015                                                        | T-003              | Concluída    | User, UserRole, objetos de valor de nome/email/senha, erros, contrato, CreateUserUseCase, factory Faker e repositório em memória. Autorização, validações, duplicidade e conflito concorrente cobertos. 54 testes unitários backend, typecheck, build, lint e execução do ESM compilado aprovados; formatação conferida. Não conclui o fluxo completo de RF-001 nem a garantia PostgreSQL |
| T-005 | Implementar persistência de contas                                     | RF-001, RN-002/RN-003/RN-010, CA-001/CA-003/CA-004                                                                                                               | T-004              | Concluída    | Model User/UserRole, migration 20261104130000_create_users aplicada localmente, mapper, PrismaUsersRepository, handler específico e binding DatabaseModule. Integração PostgreSQL isolada comprova gravação/leitura e unicidade concorrente; 74 testes unitários, 8 integração e 9 HTTP aprovados; validate, typecheck, build, lint e execução ESM/Nest/PostgreSQL aprovados              |
| T-006 | Implementar autenticação, sessões e autorização necessárias aos fluxos | RF-002/RF-005/RF-006/RF-007, RN-013 | T-005 | Concluída | Login, primeiro administrador, sessões, revogação e autorização implementados; validação integrada global permanece em T-009. |
| T-007 | Expor os fluxos HTTP de cadastro e login | RF-001 a RF-008 | T-006, T-010/T-011 | Concluída | Cadastro por rede, convites, autenticação, saída, perfil e troca de senha expostos por HTTP. |
| T-008 | Criar interface de login e cadastro administrativo | RF-001 a RF-004, RF-006 a RF-008 | T-007, T-010/T-011 | Concluída | Interface de acesso, convite, perfil e troca de senha implementada; validação visual completa permanece em T-009. |
| T-009 | Validar a primeira entrega completa                                    | RF-001/RF-002, CA-001 a CA-006 e RNFs confirmados, RF-003/RF-004/RF-005, CA-007 a CA-010                                                                         | T-008, T-010/T-011 | Concluída    | Fluxos, concorrência, rejeições sem efeitos, primeiro acesso e restrição por perfil verificados; documentação e tarefas atualizadas. |

## Complementos da primeira entrega

| ID    | Objetivo                                                   | Referências                                               | Depende de   | Situação | Condição de conclusão                                                                                                                                                                                                                                                                                        |
| ----- | ---------------------------------------------------------- | --------------------------------------------------------- | ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-010 | Implementar convite e definição da senha inicial por email | RF-003/RF-008, RN-005/RN-009/RN-014/RN-016 | T-003, T-005 | Concluída | Convites com 24 horas, uso único, reenvio e falha informada; teste visual do fluxo confirmado pelo responsável. |
| T-011 | Implementar troca voluntária da própria senha | RF-004, RN-006/RN-008/RN-013, CA-008/CA-009/CA-019 | T-003, T-006 | Concluída | Senha atual validada, nova senha protegida por hash e todas as sessões revogadas na mesma transação; concorrência testada. |

O mecanismo do primeiro administrador (RF-005/CA-010) será implementado em T-006 com as regras operacionais de RN-015 e os critérios CA-010/CA-021. T-010 e T-011 precedem as adaptações HTTP/frontend correspondentes; os IDs anteriores são preservados.

## Entregas futuras

Alunos, matrículas e demais operações serão detalhados em tarefas próprias quando seus requisitos forem levantados. Não há autorização automática para implementar módulos só porque fazem parte do objetivo geral.

## Acompanhamento

T-001 a T-011 concluídas quanto à implementação e validação da primeira entrega. Os registros abaixo preservam o histórico de cada etapa.

### Validação parcial de contas — 06/11/2026

Foram executados 193 testes unitários e 24 HTTP do backend, 58 testes de integração PostgreSQL e 20 testes do frontend, todos aprovados. A integração cobre, entre outros cenários, isolamento entre redes, autorização por vínculo, cadastro concorrente, convites e consumo concorrente, primeiro administrador, sessões e troca de senha. Os testes PostgreSQL passaram executados em sequência com `npm run test:integration --workspace @repo/backend -- --no-file-parallelism`; a tentativa paralela esgotou o tempo na preparação dos schemas. O envio de email é simulado nos testes automatizados.

Na continuação, um frontend e uma API temporários conectados a schema isolado permitiram verificar visualmente o login administrativo, a consulta do perfil, o cadastro de aluno com aviso de falha no email e a geração de link para administrador. O responsável executou a troca de senha e a definição inicial de senha pelo link de administrador; a interface retornou ao login e o banco temporário confirmou o consumo do convite e a definição da senha. A API, o frontend e o schema de teste foram removidos. O SMTP ficou desabilitado nessa rodada; o envio real com Gmail e o fluxo visual de convite de aluno já haviam sido confirmados anteriormente, conforme o histórico abaixo. T-009 concluída combinando essas verificações com os testes automatizados acima.

## Atualização do levantamento

Convites de instrutores/alunos seguem RN-009 (24 horas, uso único e invalidação do anterior no reenvio). Senhas seguem RN-008 (mínimo de 8 caracteres, maiúscula, minúscula e número, máximo de 72 bytes UTF-8); incluir CA-011 a CA-013 nas tarefas de domínio, persistência e validação da entrega. A política se aplica à senha original, não ao hash.

Administradores adicionais são cadastrados por administrador existente e definem a senha em tela no navegador (D-020/RF-008/RN-016), sem comando no servidor e sem convite por email. Incluir o fluxo em T-006, T-007, T-008 e T-009, com CA-022/CA-023 e link entregue diretamente conforme RN-016. T-003 foi concluída com D-022. Naquela atualização documental não houve implementação; posteriormente, T-004 foi concluída conforme o registro abaixo.

Nome/email seguem RN-010 e CA-014/CA-015. Sessões seguem RN-011 e CA-016. O acesso inicial e a consulta do próprio perfil seguem RN-012, RF-006 e CA-017; incluir esses critérios também nas tarefas HTTP, frontend e validação completa. Q-003 e as permissões de Q-005 estão resolvidas. Encerramento antecipado de sessões definido em RN-013 e CA-018/CA-019.

Incluir RF-007 (sair), RN-013 a RN-015 e CA-018 a CA-021 também em T-007, T-008 e T-009: saída com invalidação real da sessão atual, novo login após troca da senha, falha/reenvio de convite sem duplicar conta e proteção do comando inicial. As sessões exigem invalidação verificável no backend; remover o token apenas do navegador não atende CA-018/CA-019. A estratégia técnica será definida na implementação.

Envio de email de teste local confirmado em D-021/RNF-003; T-010 deve permitir verificar convites localmente sem fornecedor de produção. A escolha futura de serviço/remetente (Q-007) não bloqueia o desenvolvimento local. RF-008 está definido em RN-016/D-022, com CA-022/CA-023; naquela revisão houve somente definição; a implementação posterior de T-004 está registrada abaixo.

## Resultado do ciclo DDD (T-004)

- Código em apps/backend/src/domain/accounts, com testes ao lado das classes; factory em test/factories e double em test/repository-in-memory.
- CreateUserUseCase usa Either, @Injectable(), contrato importado como valor e private readonly, sem try/catch ou @Inject(). Cadastro exige administrador existente com senha definida; requestedBy deve vir do contexto autenticado na futura adaptação HTTP.
- Contas novas ficam sem senha definida; nenhum envio de convite, geração de link, comando local ou login foi implementado por antecipação. PasswordObjectValue valida a senha original, enquanto a entidade armazena somente o hash opcional para reconstituição.
- Testes: 54 aprovados em npm test --workspace @repo/backend, incluindo regras de fronteira, ausência de persistência nas rejeições, conflito concorrente em memória, propagação de falhas inesperadas e resolução do caso de uso pelo Nest sem decorators de parâmetro.
- npm run typecheck --workspace @repo/backend, npm run build --workspace @repo/backend e npm run lint --workspace @repo/backend aprovados. Execução do código ESM compilado conferida no Node. O Vitest executou com acesso ao cache nativo do SWC fora do sandbox; não foi necessário alterar a configuração de testes.
- Formatação: Prettier local aplicado e conferido somente nos arquivos criados e nos documentos alterados. Faker adicionado como devDependency do backend, com atualização do lockfile único da raiz.
- Limite: o double garante unicidade em memória; T-005 deve implementar e provar a restrição atômica no PostgreSQL, inclusive traduzindo conflito concorrente para UserAlreadyExistsError. Não foram executados E2E nem testes frontend nesta etapa.

## Resultado da persistência Prisma (T-005)

- Schema: UserRole com admin/instructor/student; User mapeado para users, nome até 120 caracteres, email único, password_hash nulo para contas pendentes e datas timestamptz(3). Não há dados de aluno/instrutor, tokens ou sessões adicionados por antecipação.
- Migration gerada por prisma migrate diff, revisada e aplicada via prisma migrate deploy no banco local confirmado (localhost:5433/base_local, schema public), sem reset ou remoção de dados. Testes aplicam a mesma migration em schema temporário próprio e removem apenas esse schema ao concluir.
- PrismaUserMapper reconstitui identidade e objetos de valor; registros incompatíveis lançam InvalidPersistedUserError sem dados sensíveis. Hash persistido não passa pela validação de senha original.
- PrismaUsersRepository implementa somente findById, findByEmail e create. Consultas sem resultado retornam null; create retorna Either, com left(UserAlreadyExistsError) somente para a constraint de email conhecida. Captura/classificação fica em src/infra/errors/prisma/prisma-user-write-error-handler.ts, sem try/catch nos repositórios/casos de uso.
- DatabaseModule registra e exporta UsersRepository; o teste resolve o módulo real pelo Nest e executa CreateUserUseCase com banco real. PrismaService passou a respeitar schema da DATABASE_URL no adapter PostgreSQL, garantindo o isolamento dos testes.
- Verificações: 74 testes unitários, 8 de integração PostgreSQL e 9 HTTP existentes, todos aprovados (91 no backend). Prisma validate, typecheck, build, lint e formatação aprovados. Build ESM executado no Node, resolvendo binding Nest e lendo PostgreSQL. O teste concorrente real traduziu o conflito de email, enquanto o conflito de chave primária preservou a exceção.
- Comando reproduzível: npm run test:integration --workspace @repo/backend. Requer PostgreSQL local do projeto em localhost:5433/base_local; usa schema com nome exclusivo e não mistura contas de teste no schema public. O sandbox do ambiente exigiu execução elevada para acesso PostgreSQL/cache nativo SWC; a configuração do runner permanece Vitest.
- Limites registrados ao concluir T-005: a migration local estava aplicada, enquanto cadastro HTTP, convites, definição de senha e login ainda não estavam disponíveis. Posteriormente, o cadastro HTTP foi implementado conforme o registro de T-007 abaixo. Nenhum usuário de teste foi inserido no schema público. Frontend não foi alterado.

## Resultado da parte de cadastro HTTP (T-007)

- POST /users em CreateUserController; schema Zod estrito junto ao controller; UserPresenter seleciona campos públicos e converte IDs/objetos de valor/datas. HttpModule registra o controller e CreateUserUseCase, reutilizando DatabaseModule e seu binding Prisma.
- Cadastro exige JWT existente e administrador consultado pelo caso de uso; requestedBy vem de CurrentUser.sub. Não foi criada rota pública de cadastro, login ou bypass do guard. Entradas password, password_hash e requestedBy são rejeitadas.
- Respostas: 201 com conta aguardando senha, 400 entrada/domínio inválido, 401 JWT ausente/inválido/expirado, 403 sem autorização, 409 email duplicado e 500 genérico para falhas inesperadas. A infraestrutura de throttling existente permanece ativa.
- Verificações: 76 testes unitários, 34 HTTP e 14 integração PostgreSQL, total 124 aprovados. Typecheck, build e lint aprovados; imports ESM e endpoint compilado conferidos pelo Node. Integração HTTP real com AppModule, JWT, caso de uso e Prisma comprovou 201/409 concorrentes e apenas uma conta gravada, além de rejeições sem efeitos. Schema temporário removido ao final.
- Frontend adiado por instrução explícita do responsável; nenhum arquivo frontend foi alterado. Login/comando de primeiro administrador continuam pendentes. Os testes preparam atores e assinam tokens pela infraestrutura JWT, sem declarar login pronto.
- Contrato e exemplos em [http-users.md](http-users.md). T-007 segue em andamento porque também contempla rotas de outros fluxos ainda não implementados.

## Resultado do ciclo DDD de autenticação (parte de T-006)

- Entidade AuthSession com identidade, user_id, created_at, expires_at e revoked_at; duração fixa de 8 horas, expiração inclusiva (no instante expires_at já é inválida) e revogação sem alterar a expiração. Não há novos objetos de valor: email reutiliza EmailObjectValue e a sessão concentra as invariantes de tempo/estado.
- AuthenticateUserUseCase normaliza o email, consulta a conta, rejeita conta sem senha e compara a senha original com o hash via HashComparer. Usa Encrypter existente para assinar sub/sid/iat/exp sem senha, hash ou perfil no payload; a conta retornada na aplicação deverá passar por presenter na futura camada HTTP. Só retorna sucesso após persistir a sessão pelo contrato. Não retorna refresh token.
- A política de PasswordObjectValue continua para definição/troca de senha, não é reaplicada ao hash no login. Login exige senha não vazia e até 72 bytes UTF-8, comparada exatamente como recebida, sem trim. Todas as rejeições de credencial usam InvalidCredentialsError sem revelar se a conta existe ou aguarda senha.
- ValidateSessionUseCase espera IDs de JWT previamente verificado, confere proprietário, estado/expiração da sessão e conta com senha definida, sem renovar expiração. SignOutUseCase revoga somente a sessão selecionada e pertencente ao solicitante.
- AuthSessionsRepository exige create/findById/revokeById; revogação futura deve ser atômica e preservar revogação anterior. Factory Faker e double em memória implementados para os testes. O contrato de sessão não possui rejeição de criação esperada neste ciclo, portanto create retorna Promise<void>; UsersRepository preserva seu Either de conflito de email.
- Convenções preservadas: Either em todos os casos de uso, sem try/catch; @Injectable(), dependências private readonly e imports de valor dos tokens sem @Inject(). Nenhum registro de provider concreto foi antecipado.
- Verificações: 119 testes unitários do backend aprovados, incluindo 43 novos testes, limites exatos de expiração, login dos três perfis, falhas sem efeitos, múltiplas sessões, logout isolado, propagação de falhas de hash/assinatura/persistência e resolução do login pelo Nest sem decorators de parâmetro. Typecheck, build, lint e formatação aprovados; imports ESM compilados e entidade executados no Node. Os testes HTTP/PostgreSQL anteriores não foram reexecutados nesta etapa de domínio.
- Limite registrado ao concluir somente o ciclo DDD: naquela etapa não havia alteração de Prisma/migrations, guard JWT, controllers, frontend ou primeiro administrador e as sessões existiam apenas no double. A persistência foi implementada posteriormente, conforme registro abaixo; não há login HTTP, consulta real de sessões pelo guard ou logout disponível pela API. A invalidação de todas as sessões após troca de senha permanece pendente em T-011. T-006 como um todo não está concluída.

## Resultado da persistência de autenticação (parte de T-006)

- AuthSession mapeada para auth_sessions, com IDs textuais conforme o core, referência obrigatória à conta, datas timestamptz(3), expires_at obrigatório e revoked_at opcional. A relação usa ON DELETE RESTRICT para não remover sessões silenciosamente; exclusão de contas não foi implementada. Índice por user_id; nenhum token, senha ou hash foi acrescentado à tabela de sessões.
- Migration 20261104140000_create_auth_sessions gerada por diff entre schemas e revisada: cria tabela/índice/FK, sem reset, alteração de usuários existentes ou remoção de dados. Aplicada via prisma migrate deploy no banco local localhost:5433/base_local, schema public. Histórico atualizado e diff banco/schema vazio.
- PrismaAuthSessionMapper preserva identidade, proprietário, expiração e revogação, reconstituindo as invariantes da entidade. Dados incompatíveis lançam InvalidPersistedAuthSessionError em src/infra/errors, sem entidade parcial ou detalhes sensíveis.
- PrismaAuthSessionsRepository implementa create/findById/revokeById. A revogação usa updateMany com id, user_id e revoked_at nulo; uma operação atômica afeta somente a sessão desse proprietário e não sobrescreve uma revogação existente. Não há try/catch no repositório nem conversão de falhas em null/sucesso.
- DatabaseModule registra e exporta AuthSessionsRepository com PrismaAuthSessionsRepository. Nos testes, login, validação e saída são resolvidos pelo Nest com contratos reais de banco e criptografia. O registro dos casos de uso na API permanece para a etapa HTTP.
- Verificações: 130 testes unitários, 27 de integração PostgreSQL e 34 HTTP existentes, total 191 aprovados. Prisma validate, typecheck, build, lint e formatação aprovados. Execução ESM compilada resolveu o token de sessão pelo Nest e consultou PostgreSQL. Novos testes cobrem JWT RS256/bcrypt reais, duração de 8 horas, sessão pendente/credenciais incorretas sem efeitos, expiração exata, logout isolado, FK, IDs duplicados, dados corrompidos, falhas e revogação concorrente.
- Integração usa schemas temporários exclusivos com migrations reais e remove somente esses schemas ao concluir. Não foram inseridas contas ou sessões de teste no schema público, nem alterados frontend, controllers ou guard. Os 34 testes HTTP anteriores continuam compatíveis; ainda não exercitam guard com consulta de sessão, pois essa adaptação não pertence a esta etapa.
- T-006 permanece em andamento: persistência de sessões concluída, mas autenticação HTTP, primeiro administrador, próprio perfil e demais fluxos definidos ainda não estão completos. Revogação de todas as sessões ao trocar senha permanece em T-011.

## Resultado da autenticação HTTP e interface

- Rotas POST /sessions, DELETE /sessions/current e GET /me implementadas; POST /users permanece administrativo. JWT exige sub/sid/iat/exp, assinatura RS256 e sessão persistida válida; logout revoga efetivamente o token dessa sessão. O papel é consultado no banco, sem confiar em campos enviados pelo cliente. Falhas inesperadas preservadas como 500 genérico.
- AuthModule registra ValidateSessionUseCase e HttpModule registra os demais casos de uso/controllers. Sem @Inject() nos casos de uso, sem try/catch na aplicação; dependências private readonly e imports .ts preservados.
- Comando npm run admin:setup --workspace @repo/backend compila e solicita nome/email/senha em terminal, ocultando a senha. Usa hash e lock transacional, recusa reexecução sem alterar contas e não é exposto por HTTP. Testes PostgreSQL comprovam o bootstrap, login e concorrência; script validado sintaticamente. O responsável ainda precisa informar seus dados para criar o administrador da aplicação.
- Frontend /login, /users e /profile com loading, erros, confirmação, autorização visual e verificação real no backend. Sessão da aba em sessionStorage (token/expiração), restauração por GET /me, expiração sem refresh e saída via API. Nenhuma senha é armazenada no navegador.
- Verificações: 130 testes unitários backend, 34 HTTP, 43 integração PostgreSQL e 13 frontend aprovados (220). Build monorepo, tipos, lint e formatação aprovados. Testes antigos do endpoint /health, removido do código atual, foram alinhados a /me; a rota não foi recriada.
- Navegador: login, cadastro persistido, erro de email duplicado, perfil, restauração ao recarregar, saída e viewport 390px verificados com uma instância PostgreSQL temporária exclusiva. Schema e processos/contêiner de teste removidos ao terminar. Nenhuma conta de teste foi criada no banco da aplicação. Captura da confirmação salva como artefato da conversa.
- O contrato de rotas, limites e comandos estão em [http-authentication.md](http-authentication.md). T-006/T-007/T-008 seguem em andamento porque também abrangem funcionalidades ainda pendentes, não apenas o fluxo implementado nesta etapa.

## Resultado da base para várias redes

Identidade global e vínculos com perfil por rede foram implementados, com redes/unidades, autorização verificada no backend e administração da plataforma separada. A API usa POST/GET /organizations, POST/GET /organizations/:id/branches e POST /organizations/:id/users; o antigo POST /users sem contexto não está disponível. O frontend permite selecionar rede, cadastrar unidades e vincular contas. A plataforma pode criar redes e provisionar o administrador da rede; não recebe vínculo automático como membro.

A migration preserva contas e valores legados sem atribuir redes ou privilégios automaticamente. A promoção da primeira conta de plataforma por admin:setup exige senha atual se o email já existir e mantém o hash e o nome. Não há credenciais padrão. JWT e sessão representam a identidade; o papel é consultado no vínculo da rede a cada operação.

Verificações: 141 testes unitários backend, 23 HTTP, 42 integração PostgreSQL e 17 frontend. Build, tipos, lint e formatação passaram; testes reais cobriram isolamento entre clientes, vínculo da mesma identidade com papéis diferentes, concorrência, promoção autenticada e migration de dados legados. A criação de rede, duas unidades e vínculo de conta foi verificada em navegador com dados e serviços temporários isolados.

## Próximo passo definido naquela etapa (histórico)

Validar a primeira entrega de ponta a ponta (T-009). Matrículas, regras de acesso entre unidades, treinos e check-in precisam ser detalhados antes da implementação.


### Infraestrutura inicial de email para testes

Nodemailer e um adaptador SMTP foram adicionados, com configuração por variáveis de ambiente no backend. Para Gmail, use uma senha de app e não a senha normal da conta. A configuração e os testes do adaptador não enviam emails reais.

Registro histórico: nesse momento o cadastro ainda não chamava o adaptador. A integração foi concluída posteriormente, conforme o resultado abaixo.


## Resultado do cadastro e primeiro acesso

O cadastro emite convites vinculados à rede. Alunos e instrutores recebem email; para administradores, o link é exibido ao administrador autorizado para entrega direta. A falha de email mantém a conta pendente e permite gerar outro convite. Identidades que já possuem senha são vinculadas sem alteração de senha.

O link expira em 24 horas e o reenvio invalida o anterior. Apenas o hash do token fica persistido, e consumo e definição da senha são transacionais, com verificação de concorrência. A senha original passa pelo PasswordObjectValue e somente o hash é guardado. O frontend oferece a página /define-password e as ações de reenvio. A migration 20261105130000_password_invitations foi aplicada ao banco local.

Testes do caso de uso, HTTP e integração PostgreSQL isolada cobrem envio simulado, reenvio, expiração, isolamento por rede, senha e consumo concorrente. O Gmail havia sido verificado separadamente com email de teste real; posteriormente o responsável confirmou o teste visual do fluxo de cadastro. Troca de senha foi implementada na etapa seguinte.

## Resultado da troca de senha

A rota autenticada PATCH /me/password verifica a senha atual e a política existente para a nova senha. A gravação do hash e a revogação das sessões são atômicas; a emissão de uma sessão de login verifica que o hash usado na autenticação permanece atual, inclusive durante uma troca concorrente. O perfil permite a troca e orienta a pessoa a entrar novamente. Não foi necessária uma migration.

Os testes validaram erros sem efeitos, duas sessões revogadas, outra conta preservada, acesso com a nova senha e corrida entre login e troca em PostgreSQL temporário. O responsável confirmou antes desta etapa o teste visual do cadastro e convite. A tela de troca de senha ainda não foi testada visualmente.

## Fluxo das próximas funcionalidades

Conforme orientação do responsável, as próximas funcionalidades serão desenvolvidas primeiro no backend: ciclo DDD, persistência quando necessária e HTTP NestJS. Ao concluir a etapa HTTP, manter exemplos REST Client em `apps/backend/requests.http` para testes manuais. A evolução visual e a integração dessas funcionalidades no frontend serão retomadas depois, ou quando solicitadas explicitamente. A validação da entrega já existente pode continuar sem antecipar novas telas de negócio.


## Plano proposto: alunos e operação da rede

Antes de cada ciclo, esclarecer as questões abertas que afetam aquela operação; não bloquear o levantamento de tarefas independentes. O fluxo permanece backend primeiro: DDD, persistência quando necessária, HTTP e exemplos REST Client; frontend não está incluído nesta etapa. A validação da primeira entrega de contas (T-009) foi concluída.

| ID | Objetivo | Dependências e decisões | Situação | Condição de conclusão |
| --- | --- | --- | --- | --- |
| T-012 | Cadastro e consulta de aluno por rede, unidade principal e conta. | RF-011, RN-020 a RN-023/RN-029; Q-012 permanece quanto a endereço sem número. | Concluída | Cadastro e consulta por rede implementados no backend, com DDD, Prisma, HTTP e exemplos REST Client. Consulta da situação de acesso depende de T-016. |
| T-013 | Cadastro de planos da rede. | RF-012/RN-024; resolver Q-013. | A planejar em detalhe | Nome, valor e duração definidos e validados, com isolamento de rede e testes. |
| T-014 | Matrícula de aluno em plano, datas e situação. | T-012/T-013, RF-013/RN-024/RN-025; resolver Q-013/Q-014. | A planejar em detalhe | Regras de vigência, estados e vínculos verificados, sem exigir plano para cadastro inicial do aluno. |
| T-015 | Cobrança e pagamento manual. | T-014, RF-014/RN-026; resolver Q-016. | A planejar em detalhe | Cobranças e quitação integral manual com isolamento de rede e autorização; nenhum serviço de pagamento externo. |
| T-016 | Consulta de situação de acesso às unidades da rede. | T-014/T-015, RF-015/RN-025/RN-027 a RN-029; resolver Q-014/Q-015/Q-017. | A planejar em detalhe | Vigência, pagamento, tolerância de um dia, suspensão e isolamento testados; sem presumir implementação de check-in. |
| T-017 | Validar o fluxo integrado de aluno, plano, matrícula, pagamento e acesso. | T-012 a T-016. | A fazer | Cenários completos, permissões de administrador/instrutor, privacidade e fronteiras de data verificadas. |



## Início do ciclo DDD de alunos

O ciclo de domínio/aplicação modela o aluno com unidade principal, CPF, telefone, data de nascimento, endereço opcional e contatos. Há validação matemática de CPF e validação inicial de telefone brasileiro com DDD; menor de 18 anos exige responsável. O administrador de rede cria o cadastro; instrutor não cria. A regra confirmada na implementação muda um vínculo existente de instrutor ou administrador para aluno na rede alvo somente se o cadastro for concluído.

O contrato de registro exige operação atômica para conta, CPF global, vínculo e aluno e preservação das senhas; a implementação em memória serve apenas aos testes. Registro histórico daquela etapa: persistência Prisma, garantias no PostgreSQL, relógio local, convite e HTTP ainda estavam pendentes. Posteriormente o cadastro foi integrado à infraestrutura, conforme o resultado abaixo; a consulta de aluno continua pendente. Verificações: 185 testes unitários do backend passaram, incluindo 30 do domínio de alunos; typecheck, lint e build passaram. Os testes de aluno usam repositórios em memória e não comprovam persistência nem garantias concorrentes no banco.


## Resultado da infraestrutura de cadastro de aluno

O cadastro foi exposto por POST /organizations/:organizationId/students, restrito a administrador da rede. O horário de Brasília determina a data utilizada para validar a idade no cadastro. A conta global tem CPF opcional e único; o cadastro de aluno está vinculado à rede, unidade e vínculo corretos, com CPF, conta, papel e aluno tratados na mesma transação. Conflitos conhecidos são tratados sem expor dados de outra rede; falhas inesperadas propagam como erro. A migration 20261105180000_student_registration foi aplicada ao banco local de desenvolvimento preservando contas existentes.

Conta sem senha recebe convite por email após o cadastro; falha de envio mantém a conta pendente e informa o resultado. Uma conta com senha mantém suas credenciais. Conforme decisão do responsável, ao concluir cadastro, um vínculo de administrador ou instrutor na rede selecionada passa a aluno. Exemplos de requisição estão em apps/backend/requests.http.

Verificações daquela etapa: 193 testes unitários, 24 HTTP e 28 testes de integração PostgreSQL isolada (12 de alunos e 16 de contas) passaram; Prisma validate, diff sem divergências no banco temporário e no banco local, typecheck, lint e build passaram. O contexto Nest compilado iniciou e resolveu o caso de uso com os providers reais. Os testes de email foram simulados; não houve envio real naquela etapa. A consulta foi implementada posteriormente, conforme abaixo.

## Consulta de alunos (T-012)

`GET /organizations/:organizationId/students` lista os cadastros da rede e `GET /organizations/:organizationId/students/:studentId` consulta um cadastro específico. Administradores e instrutores precisam de vínculo na rede; alunos e administradores da plataforma sem vínculo qualificado são recusados. A resposta inclui os dados cadastrais autorizados por RN-029, sem hash, senha ou dados financeiros. O identificador de aluno de outra rede retorna 404 para quem tem acesso à rede consultada. As respostas não são armazenadas em cache. A situação de acesso permanece na T-016, pois depende de matrícula e pagamentos. Não houve migration nem alteração de frontend.

A integração HTTP com PostgreSQL isolado passou nos 13 testes de alunos, incluindo consulta por ambos os perfis, isolamento de redes e ausência de dados financeiros e credenciais; os 24 testes HTTP existentes também passaram.

A listagem aceita `page` inteiro de 1 a 999999 (padrão 1) e retorna até 20 registros ordenados por ID, mais `pagination` com `page`, `page_size` e `has_next_page`. Página além do fim retorna lista vazia; parâmetros inválidos retornam 400. A consulta individual não é paginada. Como a paginação usa deslocamento, inserções e exclusões entre requisições podem alterar a composição das páginas.

### Interface de alunos

A rota `/students` permite a administradores e instrutores de rede consultar alunos, navegar entre páginas e visualizar os dados cadastrais. Administradores também podem cadastrar alunos escolhendo a unidade, com endereço, responsável e contato de emergência quando necessários. A tela informa o efeito sobre um vínculo administrativo ou de instrutor existente e o resultado do convite, incluindo falha de email e acesso ao reenvio. O backend continua responsável pela autorização e pelas validações. O fluxo visual de cadastro, listagem, detalhes e paginação foi verificado com dados fictícios em schema isolado; o SMTP estava desligado nessa verificação.
