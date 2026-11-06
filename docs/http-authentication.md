# Autenticação HTTP e interface

## Rotas

| Método/caminho                            | Acesso                                    | Entrada                                             | Sucesso                                                    |
| ----------------------------------------- | ----------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| POST /sessions                            | Público, login por credenciais            | email e password                                    | 200 com access_token, expires_at e user pelo UserPresenter |
| DELETE /sessions/current                  | JWT e sessão válidos                      | Nenhum body; identidade vem do contexto autenticado | 204, sessão atual revogada                                 |
| GET /me                                   | JWT e sessão válidos                      | Nenhum body                                         | 200 com o próprio user pelo UserPresenter                  |
| POST /organizations/:organizationId/users | JWT/sessão válidos e perfil administrador | name, email, role                                   | 201, conta aguardando definição de senha                   |

Schemas Zod são estritos: campos inesperados são rejeitados. Email é válido, sem espaços nas pontas e normalizado em minúsculas. No login, a senha é comparada exatamente como recebida; deve ser não vazia e ter até 72 bytes UTF-8. A política de criação/troca de senha não é reaplicada ao hash armazenado.

Credenciais incorretas, conta inexistente ou aguardando senha resultam no mesmo 401, sem criar sessão. Entrada inválida gera 400; operações administrativas sem permissão geram 403; vínculo duplicado na mesma rede gera 409. JWT inválido/expirado, sessão desconhecida/revogada ou incompatível com o proprietário geram 401. Falhas inesperadas permanecem 500 genérico, sem detalhes privados. O throttling global existente continua ativo.

Tokens RS256 incluem sub/sid/iat/exp, com validade de 8 horas e sem renovação automática. O guard verifica a assinatura, a expiração, a sessão no banco e a conta com senha definida; datas assinadas precisam corresponder às datas da sessão. Tokens antigos sem sid não autorizam acessos. Sair revoga somente a sessão atual; seu token deixa de autorizar GET /me e POST /organizations/:organizationId/users. Outras sessões permanecem válidas. Login e consulta de perfil usam Cache-Control: no-store. Senhas, hashes e props não são expostos nos presenters.

Exemplo de login:

```http
POST /sessions HTTP/1.1
Content-Type: application/json

{"email":"admin@academia.com","password":"SENHA_DO_ADMINISTRADOR"}
```

## Preparar o primeiro administrador e executar

Na raiz O:/www/project_gym:

```powershell
docker compose up -d db
npm run prisma:deploy --workspace @repo/backend
npm run admin:setup --workspace @repo/backend
npm run dev
```

O comando admin:setup compila o backend e solicita nome/email/senha e confirmação em terminal interativo. A senha não é exibida nem recebida por argumento. Usa a política de PasswordObjectValue e o HashGenerator existente. Não há credenciais padrão ou criação automática na inicialização da API. Se já existir administrador da plataforma, recusa sem modificar contas. Para promover uma conta existente, informe a senha atual; nome e hash são preservados. A transação usa advisory lock para impedir a criação concorrente de dois primeiros administradores. Não há rota pública para esse comando.

## Interface

- /login: login real, senha com opção de exibir/ocultar, validação, loading e mensagens de erro.
- /organizations e /units: seleção de rede e administração de redes/unidades conforme as permissões.
- /users: vínculo de conta à rede selecionada, com nome/email/perfil e tratamento de vínculo duplicado.
- /profile: consulta do próprio perfil e informação da expiração da sessão.
- Sair: solicita revogação na API antes de limpar o acesso local; em falha de rede, informa o problema e permite tentar novamente.

O frontend guarda apenas o token e a expiração em sessionStorage da aba, com fallback em memória se indisponível; não guarda senha. Ao recarregar, consulta GET /me para validar o acesso no servidor. A expiração limpa a sessão local e exige novo login; não há refresh automático. A interface não substitui a autorização do backend. Dados e erros retornados pela API passam por tratamento explícito no cliente.

## Limites e verificação

Novas contas ficam aguardando senha. Convites por email, link entregue diretamente para administradores adicionais, definição da senha inicial e troca da senha ainda estão pendentes. A interface informa essa condição; não declara convite enviado nem permite senha no cadastro administrativo.

Passaram 130 testes unitários backend, 34 HTTP com doubles, 43 de integração PostgreSQL e 13 frontend (220 no total). Build do monorepo, tipos, lint e formatação aprovados. A integração cobre login/saída/perfil por HTTP com Nest, bcrypt, JWT RS256, Prisma e migrations reais em schemas isolados, incluindo criação concorrente do primeiro administrador. Testes antigos de /health foram alinhados às rotas atuais, preservando a remoção dessa rota encontrada no projeto.

Verificação no navegador: login, cadastro, conflito de email, perfil, restauração após recarregar, logout e layout a 390px. Usou PostgreSQL temporário exclusivo na porta 55433 e API/frontend temporários em 3001/5174. O schema e os serviços temporários foram removidos ao terminar; não foi criado administrador nem contas de teste no banco da aplicação. O fluxo do comando inicial foi testado pela função de preparação com PostgreSQL real e o script foi validado com node --check; a entrada interativa fica para o operador informar seus próprios dados.

## Contexto de redes

Login, email e senha pertencem à identidade global. O JWT não contém perfil confiável de rede; cada operação valida no backend o vínculo e o perfil da rede solicitada. A administração da plataforma é separada e não cria vínculo de membro automaticamente. O comando inicial pode promover uma conta existente somente após verificar sua senha atual, preservando nome e hash. Veja [cadastro por rede](http-users.md).
