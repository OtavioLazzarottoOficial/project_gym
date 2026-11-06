# Definição do Project Gym

Atualizado em 05/11/2026. Origem das decisões: levantamento com o responsável pelo projeto nesta conversa.

## Contexto e objetivo

Sistema para gerenciar uma academia, seus alunos, matrículas e operação. A primeira versão será utilizada por administrador, instrutores e alunos. O primeiro resultado utilizável será a criação de contas de acesso e o login.

O problema operacional específico, o número de unidades e os volumes esperados ainda precisam ser detalhados. O segmento foi informado pelo responsável; não foi inferido apenas pelo nome da pasta.

## Estado atual

O Project Gym está sendo preparado para várias redes de academias, cada uma com suas unidades. A mesma identidade pode participar de redes independentes, com um perfil por rede. O administrador da plataforma tem autorização própria, distinta do administrador de cada rede. A primeira entrega continua focada em acesso e contas; treinos, matrículas e check-in ainda precisam de requisitos e implementação próprios.

A base multiempresa foi implementada no domínio, Prisma, HTTP e frontend: organização, unidade e vínculo; login global; perfil definido no vínculo; seleção de rede; cadastro de redes, unidades e contas. O backend verifica o vínculo na rede solicitada. O administrador da plataforma cria redes, administra suas unidades e pode vincular um administrador responsável sem receber automaticamente um vínculo na rede.

A migration 20261104170000_organization_tenancy foi aplicada ao PostgreSQL local. Contas, senhas e valores dos perfis antigos foram preservados; os perfis legados não concedem acesso e nenhuma conta foi vinculada automaticamente a uma rede ou promovida à plataforma. O comando local admin:setup prepara o primeiro administrador da plataforma; se o email já existir, exige a senha atual e preserva nome e hash.

Foram verificados 141 testes unitários backend, 23 HTTP, 42 de integração PostgreSQL e 17 frontend, além de tipos, build, lint e formatação. Testes de integração verificaram isolamento, papéis diferentes da mesma conta, concorrência e preservação de dados legados. A interface foi verificada no navegador em banco temporário: criação de uma rede, duas unidades e vínculo de conta existente. Dados de teste e serviços temporários foram removidos.

O cadastro emite convites para primeira senha: email para alunos/instrutores e link de entrega direta para administradores. A migration de convites foi aplicada ao PostgreSQL local. A troca da própria senha com invalidação das sessões foi implementada. Matrículas, treinos e check-in continuam pendentes. A autorização de entrada física em uma unidade e regras de matrícula ainda precisam ser definidas.

## Escopo

### Primeira entrega confirmada

- Administrador cadastra contas de instrutores, alunos e outros administradores.
- Identidade global com nome, email e senha; cada vínculo possui um perfil de acesso na respectiva rede.
- Login por email e senha, com email único normalizado; sessão válida por 8 horas, sem renovação automática.
- Nome obrigatório com até 120 caracteres; email válido, sem espaços nas pontas e comparado em minúsculas no cadastro e login.
- Administrador acessa o cadastro de contas; todos os perfis acessam o próprio perfil e a troca da própria senha. As demais telas ficam para depois.
- Perfis por rede: administrador, instrutor e aluno; uma conta pode ter perfis diferentes em redes distintas.
- Instrutores e alunos recebem um link por email para definir a própria senha antes do login; a senha não é enviada por email.
- A pessoa pode trocar a própria senha no perfil, informando senha atual e nova senha; a troca posterior é opcional.
- Sair encerra somente a sessão atual; trocar a senha encerra todas as sessões da conta, exigindo novo login.
- Falha ao enviar convite mantém a conta aguardando definição de senha, informa o administrador e permite reenvio.
- O comando do primeiro administrador da plataforma funciona somente enquanto não houver outro administrador da plataforma; novas execuções são recusadas sem alterar contas existentes.
- Administradores adicionais definem a própria senha em uma tela no navegador, sem comando local: o administrador que cadastrou a conta recebe um link para entregar diretamente ao novo administrador. O link vale 24 horas, é de uso único e gerar outro invalida o anterior.
- Começar com envio de email de teste local; serviço e remetente de produção serão escolhidos depois.
- Dados específicos do cadastro de aluno ou instrutor ficam para uma entrega posterior.

### Escopo futuro, ainda sem requisitos detalhados

Gestão de alunos, matrículas e operação integra o objetivo do produto, mas não autoriza implementar esses módulos agora. Treinos, planos, pagamentos, recuperação de senha e cadastro público ainda não foram definidos como entregas aprovadas; unidades têm cadastro inicial de nome e cidade.

## Atores e glossário

| Termo           | Significado confirmado                                                                    | A definir                                                  |
| --------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Conta de acesso | Identidade global usada para entrar; nome, email e senha, com perfis por vínculo          | Ativação, bloqueio e ciclo de vida                         |
| Administrador   | Administrador da rede cadastra seus membros; administrador da plataforma administra redes | Detalhes operacionais do comando de primeiro administrador |
| Instrutor       | Público da primeira versão, com conta e perfil próprios                                   | Cadastro profissional em entrega posterior                 |
| Aluno           | Público da primeira versão, com conta e perfil próprios                                   | Dados de aluno e vínculo com matrícula                     |
| Matrícula       | Conceito do objetivo de gestão da academia                                                | Campos, estados, vínculos e regras                         |

Conta de acesso e cadastro específico de aluno/instrutor são conceitos distintos no escopo. Essa distinção ainda não fixa tabelas, agregados ou relacionamentos de persistência para as entregas futuras.

## Requisitos funcionais

Todos os RFs abaixo estão confirmados quanto ao objetivo. RF-001 possui cadastro HTTP e frontend; RF-002/RF-007 possuem login/saída com sessões persistidas e guard; RF-005 possui comando inicial e RF-006 consulta do próprio perfil. Convites/primeira senha (RF-003/RF-008) e troca de senha (RF-004) foram implementados; a validação completa da primeira entrega permanece pendente. Os testes e o plano distinguem implementação parcial de entrega concluída.

| ID     | Requisito                                                                                                                                                     | Ator                                                                         | Regras                                  | Aceitação                        |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- | -------------------------------- |
| RF-001 | Cadastrar ou vincular uma identidade por email a uma rede, com um perfil nessa rede                                                                           | Administrador da rede; plataforma pode provisionar administrador responsável | RN-001, RN-002, RN-003, RN-017 a RN-019 | CA-001 a CA-004, CA-024 a CA-026 |
| RF-002 | Entrar no sistema usando email e senha de uma conta cadastrada, com acesso válido por 8 horas                                                                 | Administrador, instrutor, aluno                                              | RN-002, RN-003, RN-010, RN-011          | CA-005, CA-006, CA-015, CA-016   |
| RF-003 | Enviar ou reenviar convite por email para instrutor/aluno definir a própria senha; informar falha de envio e permitir nova tentativa                          | Administrador inicia; destinatário define a senha                            | RN-005, RN-009, RN-014                  | CA-007, CA-011, CA-012, CA-020   |
| RF-004 | Trocar a própria senha no perfil, informando senha atual e nova, encerrando todas as sessões da conta                                                         | Administrador, instrutor, aluno                                              | RN-006, RN-008, RN-013                  | CA-008, CA-009, CA-019           |
| RF-005 | Preparar o primeiro administrador da plataforma por comando local com nome, email e senha                                                                     | Operador responsável                                                         | RN-007, RN-015, RN-019                  | CA-010, CA-021                   |
| RF-006 | Consultar o próprio perfil após o login                                                                                                                       | Administrador, instrutor, aluno                                              | RN-012                                  | CA-017                           |
| RF-007 | Sair do sistema encerrando a sessão atual                                                                                                                     | Administrador, instrutor, aluno                                              | RN-013                                  | CA-018                           |
| RF-008 | Gerar ou reemitir link para administrador adicional definir a própria senha inicial no navegador, com entrega direta pelo administrador que cadastrou a conta | Administrador existente gera e entrega; novo administrador define a senha    | RN-001, RN-008, RN-016                  | CA-022, CA-023                   |
| RF-009 | Cadastrar e consultar redes, respeitando a administração da plataforma e os vínculos da pessoa                                                                | Administrador da plataforma; membros da rede                                 | RN-017, RN-019                          | CA-024                           |
| RF-010 | Cadastrar e consultar unidades de uma rede                                                                                                                    | Administrador da plataforma ou da rede; membros consultam                    | RN-017                                  | CA-024                           |

## Regras de negócio

| ID     | Regra confirmada                                                                                                                                                                                                                                                                                                                                         | Referências                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| RN-001 | Um administrador de rede gerencia vínculos de contas somente na própria rede. O administrador da plataforma pode provisionar o administrador responsável sem se tornar membro automaticamente                                                                                                                                                            | RF-001, RN-017, RN-019                       |
| RN-002 | O email deve ser único entre as contas, considerando sua forma normalizada conforme RN-010                                                                                                                                                                                                                                                               | RF-001, RF-002, RF-005                       |
| RN-003 | Uma identidade pode ter um vínculo por rede, com um perfil em cada vínculo: administrador, instrutor ou aluno. O mesmo login pode ter perfis diferentes em redes independentes                                                                                                                                                                           | RF-001, RF-002, RN-018                       |
| RN-004 | A identidade possui nome, email e senha; o perfil pertence ao vínculo com a rede. Dados específicos de aluno/instrutor serão definidos posteriormente                                                                                                                                                                                                    | RF-001, RN-018                               |
| RN-005 | Instrutores e alunos definem a senha por um link recebido por email e depois realizam login. Não enviar senha pronta por email. A senha não é um dado exigido do administrador ao emitir esse convite                                                                                                                                                    | RF-001, RF-002, RF-003                       |
| RN-006 | A troca voluntária de senha no perfil exige a senha atual e uma nova senha válida. Uma senha atual incorreta rejeita a alteração                                                                                                                                                                                                                         | RF-004                                       |
| RN-007 | O primeiro administrador da plataforma é preparado por comando local. A administração de uma rede é atribuída por vínculo separado                                                                                                                                                                                                                       | RF-001, RF-005, RN-019                       |
| RN-008 | Senha com pelo menos 8 caracteres, incluindo maiúscula, minúscula e número, e no máximo 72 bytes em UTF-8. Aplicar à definição inicial, inclusive à definição inicial no navegador para administradores adicionais, ao comando do primeiro administrador e à troca de senha; nunca aplicar a política ao hash armazenado                                 | RF-003, RF-004, RF-005, D-013                |
| RN-009 | Convite de instrutor/aluno válido por 24 horas e utilizável uma única vez. Ao reenviar, invalidar o link anterior. O consumo deve impedir reutilização inclusive em acessos concorrentes                                                                                                                                                                 | RF-003, RN-005, CA-007, CA-011, CA-012       |
| RN-010 | Nome obrigatório, não composto apenas por espaços, com até 120 caracteres. Email válido: remover espaços nas pontas e normalizar em minúsculas para cadastro, unicidade e login                                                                                                                                                                          | RF-001, RF-002, RF-005, CA-014, CA-015       |
| RN-011 | Cada login concede sessão válida por 8 horas a partir do login. Ao expirar, exigir novo login; não haverá renovação automática                                                                                                                                                                                                                           | RF-002, CA-005, CA-016                       |
| RN-012 | Após login, cada pessoa consulta o próprio perfil e suas redes; o acesso a contas e unidades depende do papel na rede. Administração da plataforma é uma permissão separada                                                                                                                                                                              | RF-001, RF-006, RN-017, RN-019               |
| RN-013 | Sair invalida somente a sessão atual; outras sessões da conta permanecem válidas até sua expiração ou invalidação. A troca bem-sucedida da senha invalida todas as sessões da conta, incluindo a atual, e exige novo login                                                                                                                               | RF-002, RF-004, RF-007, CA-018, CA-019       |
| RN-014 | Se o envio do convite falhar, manter a conta aguardando definição de senha, informar a falha ao administrador e permitir reenvio. Falha de envio não concede acesso nem define senha; reenvios continuam obedecendo RN-009                                                                                                                               | RF-001, RF-003, CA-020                       |
| RN-015 | O comando inicial só prepara administrador da plataforma quando ainda não houver outro. Para promover identidade existente, verifica a senha atual e preserva nome e hash; reexecuções não alteram contas existentes                                                                                                                                     | RF-005, CA-010, CA-021                       |
| RN-016 | Administrador existente cadastra a conta de administrador adicional e recebe um link para entregar diretamente ao novo administrador, sem envio de convite por email. O destinatário define a própria senha no navegador. Link válido por 24 horas, de uso único; gerar outro invalida o anterior. A conta não permite login antes da definição da senha | RF-001, RF-008, D-020, D-022, CA-022, CA-023 |
| RN-017 | Uma rede é uma organização cliente e pode ter várias unidades. Toda operação por rede verifica o vínculo e suas permissões no backend antes de ler ou gravar dados                                                                                                                                                                                       | RF-009, RF-010, CA-024                       |
| RN-018 | Email e senha pertencem à identidade global; vincular conta existente preserva nome, hash e acesso à plataforma, sem alterar outros vínculos                                                                                                                                                                                                             | RF-001, CA-025, CA-026                       |
| RN-019 | Administrador da plataforma e administrador da rede são permissões separadas; acesso de plataforma não cria vínculo automático de membro nem transforma o perfil global legado em autorização                                                                                                                                                            | RF-005, RF-009, CA-026                       |

A conta de instrutor/aluno permanece aguardando definição de senha até concluir o convite, inclusive quando o envio falhar; não pode realizar login antes de definir sua senha. A representação técnica desse estado será escolhida na implementação. A política de senha está definida em RN-008. Trocas de perfil e regras de matrícula continuam sem definição. Exemplos de outras aplicações não são regras deste projeto.

## Requisitos não funcionais

Ainda não há metas de desempenho, disponibilidade, escala ou operação confirmadas. A situação de cada item distingue proposta de requisito confirmado; propostas não são aprovadas por silêncio.

| ID      | Proposta                                                                                                     | Forma proposta de verificar                                                        | Situação                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| RNF-001 | Armazenar senhas como hash e não incluir senha/hash nas respostas ou logs da aplicação                       | Inspecionar persistência e testar respostas e tratamento de erros de RF-001/RF-002 | Proposto; decisão de proteção técnica ainda a consolidar             |
| RNF-002 | Exigir autenticação e autorização para RF-001, permitindo criação somente ao perfil administrador            | Testar rejeição de requisição anônima e de instrutor/aluno, sem criar conta        | Confirmado por RN-001, RN-012 e D-016                                |
| RNF-003 | Usar envio de email de teste local nesta etapa; serviço e remetente de produção ficam para decisão posterior | Verificar convites no ambiente local sem depender de fornecedor de produção        | Confirmado em D-021; configuração técnica a definir na implementação |

A base já escolhe NestJS/DDD, Prisma/PostgreSQL, JWT RS256, bcryptjs, React/shadcn/TanStack Router, Vitest e imports .ts com reescrita no build. São decisões técnicas existentes, e não constituem metas de qualidade inventadas; o estado das funcionalidades está descrito acima.

## Critérios de aceitação

| ID     | Cenário e resultado esperado                                                                                                                                                                                                                                                                                                       | Referências                                                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-001 | Dado um administrador autorizado e dados válidos com email novo, ao cadastrar administrador, instrutor ou aluno, a conta é criada com o perfil escolhido                                                                                                                                                                           | RF-001, RN-001, RN-003, RN-004, RN-010; senha conforme RN-008; definição inicial no navegador para administradores adicionais em RN-016/D-022 |
| CA-002 | Dado alguém sem a autorização de administrador, ao tentar cadastrar uma conta, a operação é rejeitada sem persistência                                                                                                                                                                                                             | RF-001, RN-001                                                                                                                                |
| CA-003 | O email normalizado identifica uma única conta global. O mesmo email pode criar vínculos em redes distintas; vínculo duplicado na mesma rede é recusado, inclusive em concorrência                                                                                                                                                 | RF-001, RN-002, RN-018, CA-025                                                                                                                |
| CA-004 | Cada vínculo possui exatamente um perfil naquela rede; a mesma conta pode ter outro perfil em outra rede, sem exigir dados específicos futuros                                                                                                                                                                                     | RF-001, RN-003, RN-004, RN-018                                                                                                                |
| CA-005 | Dada uma conta com senha definida e credenciais corretas, o login estabelece acesso autenticado associado à conta e ao perfil por 8 horas, sem renovação automática                                                                                                                                                                | RF-002, RN-003, RN-011                                                                                                                        |
| CA-006 | Dadas credenciais incorretas, ao tentar login, o sistema rejeita o acesso e não cria uma sessão válida                                                                                                                                                                                                                             | RF-002                                                                                                                                        |
| CA-007 | Após o cadastro de instrutor/aluno, um email permite acessar o fluxo de definição de senha; com senha válida definida, a pessoa pode realizar login. O email não contém senha pronta                                                                                                                                               | RF-001, RF-002, RF-003, RN-005; validade/reenvio em RN-009; falhas conforme RN-014; serviço/remetente em Q-007                                |
| CA-008 | Com senha atual correta e nova senha válida, persistir a troca: a nova senha passa a ser aceita no login e a anterior deixa de ser aceita; todas as sessões existentes são invalidadas e a pessoa precisa realizar novo login                                                                                                      | RF-004, RN-006, RN-008, RN-013, CA-019                                                                                                        |
| CA-009 | Ao informar senha atual incorreta ou nova senha inválida, a troca é rejeitada sem alterar a senha persistida                                                                                                                                                                                                                       | RF-004, RN-006; política definida em RN-008                                                                                                   |
| CA-010 | Sem administrador da plataforma, o comando local cria um ou promove uma identidade existente após verificar sua senha atual; com administrador existente, recusa sem alterar contas                                                                                                                                                | RF-005, RN-007, RN-015                                                                                                                        |
| CA-011 | Ao usar um convite expirado ou já consumido, rejeitar a definição de senha sem alterar a conta nem conceder acesso. O mesmo convite não pode ser consumido duas vezes em concorrência                                                                                                                                              | RF-003, RN-009                                                                                                                                |
| CA-012 | Após o reenvio de convite, o link anterior deixa de permitir a definição da senha; o novo link segue validade de 24 horas e uso único                                                                                                                                                                                              | RF-003, RN-009; falhas de envio conforme RN-014; serviço/remetente em Q-007                                                                   |
| CA-013 | Senha abaixo de 8 caracteres, sem maiúscula/minúscula/número ou acima de 72 bytes UTF-8 é rejeitada sem persistir nova senha; uma senha que atenda a esses critérios pode seguir o fluxo definido                                                                                                                                  | RF-003, RF-004, RF-005, RN-008                                                                                                                |
| CA-014 | Rejeitar nome vazio, composto apenas por espaços ou com mais de 120 caracteres, e email inválido, sem criar a conta                                                                                                                                                                                                                | RF-001, RF-005, RN-010                                                                                                                        |
| CA-015 | No login, remover espaços nas pontas do email e comparar em minúsculas; variações de caixa e espaços nas pontas identificam a mesma conta e exigem a senha correta                                                                                                                                                                 | RF-002, RN-010                                                                                                                                |
| CA-016 | Após completar 8 horas desde o login, a sessão deixa de autorizar operações protegidas e o frontend exige novo login, sem renovar automaticamente                                                                                                                                                                                  | RF-002, RN-011                                                                                                                                |
| CA-017 | Após login válido, todos os perfis podem consultar o próprio perfil e trocar a própria senha com as validações de RF-004; instrutor/aluno não acessam cadastro de contas nem perfis de outras pessoas                                                                                                                              | RF-001, RF-004, RF-006, RN-012                                                                                                                |
| CA-018 | Com duas sessões válidas da mesma conta, sair em uma faz suas credenciais de sessão deixarem de autorizar operações protegidas; a outra permanece válida                                                                                                                                                                           | RF-007, RN-013                                                                                                                                |
| CA-019 | Após troca bem-sucedida de senha, as credenciais de todas as sessões anteriores, inclusive a atual, deixam de autorizar operações protegidas; novo login com a nova senha pode criar nova sessão                                                                                                                                   | RF-002, RF-004, RN-013                                                                                                                        |
| CA-020 | Se o envio inicial ou reenvio do convite falhar, manter a conta aguardando definição de senha, informar a falha ao administrador e permitir outra tentativa; não liberar login nem criar outra conta ao reenviar                                                                                                                   | RF-001, RF-003, RN-009, RN-014                                                                                                                |
| CA-021 | Com administrador da plataforma existente, repetir o comando inicial não altera nenhuma conta nem cria outro administrador da plataforma                                                                                                                                                                                           | RF-005, RN-015                                                                                                                                |
| CA-022 | Ao cadastrar administrador adicional, disponibilizar o link ao administrador que cadastrou a conta para entrega direta. Com link válido e senha conforme RN-008, o novo administrador define sua senha no navegador e pode fazer login; antes disso, não pode. Não usar comando local nem enviar convite por email para esse fluxo | RF-001, RF-008, RN-008, RN-016                                                                                                                |
| CA-023 | Link de administrador adicional expirado, consumido ou substituído não permite definir senha nem conceder acesso. Gerar outro invalida o anterior e inicia nova validade de 24 horas; o mesmo link não pode ser consumido duas vezes, inclusive em concorrência                                                                    | RF-008, RN-016                                                                                                                                |
| CA-024 | Redes independentes não acessam contas ou unidades umas das outras; pessoas vinculadas a uma rede consultam suas unidades                                                                                                                                                                                                          | RF-009, RF-010, RN-017                                                                                                                        |
| CA-025 | Duas redes podem vincular a mesma identidade com perfis diferentes sem duplicar a conta ou alterar sua senha, inclusive em cadastros concorrentes                                                                                                                                                                                  | RF-001, RN-018                                                                                                                                |
| CA-026 | Uma conta sem vínculo administrativo não cadastra usuários da rede; privilégio de plataforma não cria automaticamente vínculo de membro                                                                                                                                                                                            | RF-001, RF-005, RN-019                                                                                                                        |

## Decisões confirmadas

- D-001: segmento e objetivo de gestão de academia, com alunos, matrículas e operação.
- D-002: administrador, instrutores e alunos utilizarão a primeira versão.
- D-003: a primeira entrega será contas de acesso e login.
- D-004: administrador cadastra instrutores e alunos.
- D-005: conta inicialmente com nome, email e senha; a decisão anterior de perfil global foi substituída por D-024, mantendo dados específicos para depois.
- D-006: login por email/senha e email único; o perfil por conta foi substituído por perfil em cada vínculo conforme D-024.

- D-007: primeiro administrador criado por comando local, com nome, email e senha informados pelo operador. Administradores adicionais são cadastrados por administradores existentes (D-008).

- D-008: administradores existentes podem criar administradores adicionais.
- D-009: instrutores/alunos recebem link por email para definir sua própria senha e depois realizar login; substitui a possibilidade inicialmente discutida de enviar senha pronta por email.
- D-010: a troca posterior de senha no perfil é opcional e exige senha atual e nova senha.

- D-011: convite de instrutor/aluno válido por 24 horas, de uso único; reenvio invalida o link anterior.
- D-012: senha com mínimo de 8 caracteres, maiúscula, minúscula e número; máximo de 72 bytes UTF-8.
- D-013: decisão anterior descrevia a definição da senha de administrador adicional como procedimento local, sem convite por email. A interpretação de comando local foi esclarecida e substituída por D-020: trata-se de uma tela no navegador.

- D-014: nome obrigatório com até 120 caracteres; email válido, removendo espaços nas pontas e normalizando em minúsculas para cadastro, unicidade e login.
- D-015: sessão de 8 horas a partir do login; expiração exige novo login e não há renovação automática.
- D-016: administrador acessa o cadastro de contas; todos os perfis acessam somente o próprio perfil e a troca da própria senha nesta entrega.

- D-017: sair encerra somente a sessão atual; trocar a senha encerra todas as sessões da conta e exige novo login.
- D-018: falha no envio do convite mantém a conta aguardando definição de senha, informa o administrador e permite reenvio.
- D-019: comando do primeiro administrador permitido apenas enquanto nenhum administrador existir; reexecuções são recusadas sem alterar contas existentes, separadamente da definição de senha no navegador dos demais administradores (D-020).

- D-020: o administrador adicional define a própria senha em tela no navegador; não se trata de um comando no servidor. Mantém-se a conta criada por administrador existente e a ausência de convite por email. Acesso por link entregue diretamente conforme D-022/RN-016.
- D-021: começar com envio de email de teste local; escolha de serviço e remetente de produção adiada.

- D-022: administrador que cadastrou a conta adicional recebe um link para entregar diretamente ao novo administrador; validade de 24 horas, uso único e invalidação do anterior ao gerar outro.

- D-023: produto para várias redes independentes; cada rede pode ter várias unidades.
- D-024: identidade e login globais; a mesma pessoa pode integrar várias redes com um perfil diferente em cada vínculo.
- D-025: administração da plataforma é separada da administração de cada rede.
- D-026: inicialmente, rede tem nome; unidade tem nome e cidade. CNPJ, endereço completo e assinatura comercial ficam para depois.

As decisões anteriores sobre perfil único por conta foram substituídas por D-024; email único continua global.

## Questões resolvidas

- Q-001: resolvida quanto ao fluxo — primeiro administrador por comando local; administradores adicionais por administradores existentes. Reexecução definida em RN-015/D-019.

- Q-004: política de senha resolvida em RN-008/D-012.

- Q-009: fluxo esclarecido — conta criada por administrador existente e senha definida pelo novo administrador em tela no navegador (D-020). Entrega direta e ciclo de vida do link definidos em D-022/RN-016.

- Q-003: resolvida em RN-010/D-014.
- Q-005: permissões e telas iniciais resolvidas em RN-012/D-016. Bloqueio/desativação de contas não foi solicitado; permanece como possível escopo futuro, sem bloquear esta entrega.
- Q-002: resolvida em RN-011/RN-013 e D-015/D-017: sessão de 8 horas sem renovação, saída encerra a atual e troca de senha encerra todas.
- Q-008: resolvida em RN-015/D-019; comando inicial recusa execução quando já existe administrador, sem alterar contas existentes.
- Q-007: envio de teste local confirmado em RNF-003/D-021; tratamento de falhas em RN-014/D-018. Serviço e remetente de produção ficam adiados, sem bloquear os testes locais.

- Q-010: resolvida em D-022/RN-016 e CA-022/CA-023; definição de senha no navegador por link entregue diretamente pelo administrador que cadastrou a conta.

## Questões em aberto

| ID    | Questão                                                                             | Impacto                                                                             |
| ----- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Q-006 | Quais volumes, hospedagem e necessidades de disponibilidade/operação são esperados? | Refinamento posterior de RNFs; suporte a múltiplas redes e unidades está confirmado |
| Q-007 | Qual serviço de email e endereço remetente serão usados em produção?                | Decisão adiada; não bloqueia o envio de teste local confirmado em RNF-003           |

## Situação do levantamento

As decisões de negócio necessárias para iniciar a primeira entrega local foram registradas. Q-006 (operação/escala) e Q-007 (email de produção) permanecem para refinamento posterior; não bloqueiam o início do domínio/aplicação. RNF-001 continua identificado como proposta técnica, sem ser convertido em decisão confirmada por silêncio. A revisão documental foi concluída; posteriormente, T-004/T-005 implementaram domínio/aplicação e persistência do cadastro conforme o estado atual acima.

## Plano

Consultar [plano de implementação](implementation-plan.md). Decisão confirmada não significa implementação concluída.


## Planejamento: alunos, planos, matrículas e controle financeiro manual

### Escopo e estado

Decisões confirmadas em conversa com o responsável. O cadastro específico de aluno foi implementado no backend; consulta de alunos, planos, matrículas e controle financeiro ainda não foram implementados. O cadastro de aluno complementa a conta de acesso existente; o cadastro de aluno pode ser feito antes de escolher plano ou criar matrícula. O primeiro acesso continua seguindo o fluxo de conta e convite já definido. A evolução será feita primeiro no backend; frontend novo fica para etapa posterior ou pedido explícito.

Cada pessoa tem identidade global e CPF único globalmente; cada rede independente mantém seu próprio cadastro de aluno. O aluno tem uma unidade principal da rede. O administrador poderá vincular uma conta existente ou criá-la no cadastro. Não presumir que um CPF digitado autorize vincular ou incorporar dados de uma conta existente: conflitos e comprovação do vínculo seguem em aberto.

### Requisitos funcionais

| ID | Objetivo confirmado | Atores | Referências |
| --- | --- | --- | --- |
| RF-011 | Cadastrar e consultar aluno por rede, com unidade principal e conta existente ou criada no fluxo. | Administrador cadastra e consulta; instrutor consulta. | RN-020 a RN-023; CA-027 a CA-030 |
| RF-012 | Cadastrar planos de uma rede com nome, valor e duração. | Administrador da rede. | RN-024; CA-031 |
| RF-013 | Criar matrícula associada a aluno e plano, registrando início, término e situação. | Administrador da rede. | RN-024, RN-025; CA-031 |
| RF-014 | Registrar cobranças e pagamentos manualmente, sem integração com serviço externo. | Administrador da rede. | RN-026; CA-032 |
| RF-015 | Consultar a situação de acesso do aluno às unidades da própria rede. | Administrador e instrutor da rede. | RN-027, RN-028; CA-033 a CA-036 |

### Regras de negócio

| ID | Regra confirmada | Referências |
| --- | --- | --- |
| RN-020 | Além de nome e email da conta, telefone brasileiro com DDD, data de nascimento e CPF são obrigatórios no cadastro do aluno. Telefones do aluno, responsável e contato de emergência podem ser fixos ou celulares; aceitar formatação com parênteses, espaços e hífen e armazenar somente dígitos. Validar DDD brasileiro e 10 ou 11 dígitos, sem consulta da existência da linha. Endereço e contato de emergência são opcionais. Quando informado, o endereço exige CEP, rua, número, bairro, cidade e estado; complemento é opcional. Quando informado, o contato de emergência exige nome, telefone e parentesco. Aluno que ainda não completou 18 anos na data do cadastro exige responsável com nome, telefone e relação com o aluno. A data do cadastro considera o horário de Brasília (America/Sao_Paulo). | RF-011; CA-027 |
| RN-021 | CPF deve ser brasileiro estruturalmente válido, com dígitos verificadores válidos e rejeição de sequências inválidas. Validação matemática não comprova titularidade nem situação cadastral na Receita. | RF-011; CA-028 |
| RN-022 | Um CPF identifica uma pessoa globalmente. Uma rede mantém seu próprio cadastro de aluno para essa pessoa, sem que um cadastro em uma rede conceda acesso a outra rede independente. Quando CPF e email corresponderem à mesma conta, ela poderá ser reutilizada sem alterar senha ou expor dados da outra rede. Se um CPF já estiver associado a uma conta com outro email, rejeitar a vinculação automática e informar o conflito; resolução do conflito ficará para procedimento futuro. Se a conta identificada pelo email ainda não tiver CPF, o administrador poderá associar o CPF informado desde que ele não pertença a outra conta. | RF-011; CA-029 |
| RN-023 | Cada cadastro de aluno escolhe uma unidade principal da sua rede; não é necessário duplicar o cadastro em cada unidade da mesma rede. Cadastro pode ser feito sem plano e sem matrícula. Ao concluir o cadastro, um vínculo existente de instrutor ou administrador na mesma rede passa a ter perfil aluno; a mudança ocorre apenas se o cadastro for concluído. Outros vínculos de rede e privilégios de plataforma não são alterados. | RF-011; CA-030 |
| RN-024 | O plano da rede tem nome, valor e duração; o administrador escolhe um plano posteriormente ao matricular o aluno. A matrícula registra início, término e situação ativa, suspensa ou encerrada. | RF-012, RF-013; CA-031 |
| RN-025 | Somente uma matrícula ativa pode dar acesso; suspensão ou encerramento não liberam acesso. A verificação também considera vigência e pagamento, conforme RN-027 e RN-028. | RF-013, RF-015; CA-034 |
| RN-026 | Cobranças são cadastradas manualmente com matrícula, valor, vencimento, período cobrado e situação. Pagamentos são registrados manualmente com valor, data, forma e período de referência. Um pagamento quita uma cobrança integralmente; pagamentos parciais e integração com provedor financeiro ficam para depois. | RF-014; CA-032 |
| RN-027 | Uma matrícula ativa e vigente com pagamento registrado para período válido pode liberar acesso a todas as unidades da mesma rede, sem duplicar cadastro. Sem nenhum pagamento para período válido, não há acesso inicial. | RF-015; CA-033, CA-035 |
| RN-028 | Após o último dia do período pago, há um dia de tolerância: se o período termina no dia 10, o acesso continua no dia 11 e, sem outro período válido, bloqueia no dia 12. Essa tolerância não altera as demais condições de RN-025. Fuso/calendário e relação com término da matrícula permanecem em aberto. | RF-015; CA-034, CA-036 |
| RN-029 | Administradores da rede cadastram, consultam e editam alunos, alteram a unidade principal e controlam cobranças e pagamentos. Administradores e instrutores da mesma rede podem consultar CPF, endereço, responsável, contato de emergência e situação de acesso; instrutores não acessam valores nem histórico financeiro nem editam o cadastro. | RF-011, RF-014, RF-015; CA-030, CA-037 |

### Critérios de aceitação

- CA-027: rejeitar cadastro sem telefone brasileiro com DDD, data de nascimento ou CPF; admitir ausência de endereço e contato de emergência. Se fornecidos, exigir os campos previstos em RN-020; para aluno que não completou 18 anos, exigir nome, telefone e relação do responsável.

- CA-028: rejeitar CPF com dígitos verificadores inválidos ou sequência inválida, sem gravar aluno.

- CA-029: impedir atribuir um CPF global a pessoas diferentes; quando CPF e email corresponderem à mesma conta, admitir cadastro em outra rede sem alterar senha ou expor dados da rede anterior. Se o CPF pertencer a conta com outro email, rejeitar vinculação automática e informar conflito. Para conta existente identificada pelo email que ainda não possui CPF, admitir associação somente se o CPF ainda não pertencer a outra conta; garantir a unicidade também em concorrência.

- CA-030: administrador cadastra o aluno na unidade principal da própria rede, com conta nova ou existente; instrutor não cadastra. Cadastro sem plano e matrícula é aceito.

- CA-031: administrador cadastra plano com nome, valor e duração e posteriormente vincula plano ao criar matrícula com datas e situação.

- CA-032: administrador registra cobrança e pagamento integral manual com os dados definidos, sem exigir integração financeira ou aceitar pagamento parcial como quitação.

- CA-033: aluno sem pagamento para período válido não recebe liberação inicial.

- CA-034: matrícula suspensa ou encerrada não libera acesso, ainda que existam pagamentos.

- CA-035: matrícula ativa e vigente com período pago válido libera acesso às unidades da própria rede, sem conceder acesso a outras redes.

- CA-036: pago até dia 10, acesso permitido no dia 11 e bloqueado a partir do dia 12, na ausência de outro período válido e mantidas as demais condições.

- CA-037: administrador e instrutor da mesma rede podem consultar CPF, endereço, responsável, contato de emergência e situação de acesso; instrutor não consulta valores nem histórico financeiro nem edita cadastro ou unidade principal. Acessos não autorizados são recusados no backend.

### Questões em aberto antes das operações afetadas

- Q-011: O vínculo automático em caso de CPF de conta com outro email foi recusado; como será o procedimento futuro de resolução do conflito? Não bloqueia a regra inicial de associação definida em RN-022.

- Q-012: Como representar endereço sem número? A validação inicial de telefones do aluno, responsável e contato foi definida em RN-020. Campos obrigatórios do endereço, contato e responsável também estão em RN-020.

- Q-013: Qual unidade de duração e como calcular início/término do plano; alterações de preço/duração afetam matrículas existentes? Afeta planos e matrículas.

- Q-014: Quais transições de situação e regras para matrículas simultâneas, renovação e períodos sobrepostos? A matrícula pode ser criada ativa antes da quitação? Afeta matrículas e acesso.

- Q-015: A tolerância pode ultrapassar o término da matrícula? Qual fuso/data local vale para redes com unidades em fusos diferentes? Afeta cálculo de acesso e limites de datas.

- Q-016: Quais situações de cobrança e formas de pagamento são aceitas; valor pago deve ser igual ao cobrado; como tratar desconto, cancelamento, estorno, duplicidade, pagamentos antecipados e alteração de períodos? Afeta controle financeiro.

- Q-017: Qual operação verificará o acesso e quem poderá executá-la? O fluxo de check-in e registro de entrada será definido separadamente. Afeta exposição HTTP da consulta de acesso.

- Q-018: Quais requisitos concretos de retenção se aplicam aos dados cadastrais? Em RN-029 foram definidos consulta por administradores e instrutores da mesma rede e edição exclusiva por administradores.
