# Cadastro de contas por rede

`POST /organizations/:organizationId/users` exige JWT e sessão válidos e verifica a autorização na rede indicada. O body estrito recebe `name`, `email` e `role` (`admin`, `instructor` ou `student`). O administrador da rede cadastra seus membros; o administrador da plataforma pode provisionar o administrador responsável sem se tornar membro automaticamente.

O email é normalizado e identifica uma conta global. Se já existir, a conta é vinculada à rede sem alterar nome, senha, acesso à plataforma ou vínculos de outras redes. Um segundo vínculo na mesma rede retorna 409 sem alterar o perfil anterior. A resposta 201 contém `user` com campos públicos e `membership` com rede e perfil. Campos adicionais, senha e privilégios de plataforma no body são rejeitados. O antigo `POST /users` sem contexto não existe.

As demais rotas são `GET/POST /organizations` e `GET/POST /organizations/:organizationId/branches`. Sessão e perfil são verificados no backend; passar um ID de outra rede não concede acesso. Um membro consulta as unidades de sua rede. O cadastro de unidades exige administração da rede ou da plataforma.

Contas novas continuam aguardando definição de senha. Convites e o primeiro acesso dos demais usuários ainda estão pendentes. Consulte [autenticação](http-authentication.md) e o [plano](implementation-plan.md).
