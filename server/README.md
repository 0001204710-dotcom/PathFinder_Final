# PathFinder - Server

Backend mínimo usando Express + Prisma (MySQL).

Passos rápidos:

1. Instalar dependências:

```bash
cd server
pnpm install
```

2. Configure `DATABASE_URL` no `.env`, sincronize o schema e cadastre o catálogo de planos:

```bash
pnpm prisma:generate
pnpm prisma:push
pnpm prisma:seed-plans
```

3. Rodar em desenvolvimento:

```bash
pnpm dev
```

4. Acessar endpoints:

- `GET /api/health`
- `GET /api/plans`
- `GET /api/subscription` (autenticado)
- `POST /api/subscription/simulate` (autenticado)
- `GET /api/dependentes` (autenticado e com plano demonstrativo ativo)
- `GET /api/alertas/recorrentes` (autenticado)
- `DELETE /api/alertas/recorrentes/:id` (autenticado)
- `GET /api/institutional/dashboard` (gestor institucional ou profissional vinculado)
- `POST /api/institutional/doctors` (gestor institucional)
- `POST /api/institutional/groups` (gestor institucional)
- `PATCH /api/institutional/dependents/:id/assignment` (gestor institucional)
- `PATCH /api/institutional/alerts/:id` (gestor ou profissional, limitado ao próprio escopo)

As contratações são apenas demonstrativas: os valores em reais e o período de 30 dias são
registrados no banco, mas não existe cobrança, aprovação financeira ou armazenamento de cartão.
Os valores anual e mensal são armazenados separadamente no catálogo; contratos anuais de demonstração
ficam válidos por 365 dias e contratos mensais por 30 dias.
O endpoint `POST /api/subscription/simulate` recebe `{ "planId": 1, "billingCycle": "mensal" }`
ou `{ "planId": 1, "billingCycle": "anual" }`.

O plano Institucional direciona o titular para o painel de gestão. Nele, o titular cadastra
profissionais com contas individuais, cria grupos e atribui pessoas diretamente a um profissional
ou a um grupo. Profissionais entram pela tela de login normal e veem somente as pessoas atribuídas
a eles ou aos grupos sob sua responsabilidade; podem resolver apenas alertas dentro desse escopo.
Somente o gestor cadastra profissionais, cria grupos e altera atribuições. O painel sincroniza
automaticamente seus dados com o banco a cada 30 segundos. A senha inicial é definida pelo gestor
e deve ser compartilhada com o profissional por um canal seguro.

Para preparar o banco de dados com os campos e tabelas institucionais, execute `pnpm prisma:push`
e gere novamente o cliente com `pnpm prisma:generate`.

Recuperação de senha: aplique as alterações de schema com `pnpm prisma:push` e gere o cliente com
`pnpm prisma:generate`. Configure o envio SMTP no painel administrativo; o e-mail de contato do
administrador é definido por `ADMIN_EMAIL` no `.env`. O código enviado por e-mail expira em 15
minutos e só pode ser usado uma vez. Se a pessoa perdeu o acesso ao e-mail, ela pode gerar um
código para informar ao administrador, que deve digitá-lo ao alterar a senha no cadastro do usuário.
O envio por SMS permanece indisponível até que um provedor seja configurado.

Alertas podem ser cadastrados com repetição semanal. O servidor cria cada ocorrência no horário
programado (fuso de Brasília) e a tela de alertas permite cancelar uma programação ativa. Após
atualizar o schema, execute `pnpm prisma:generate` e `pnpm prisma:push` para aplicar a tabela de
programações recorrentes.

HeidiSQL: conecte-se ao mesmo banco (host/porta/user/password) definido em `.env`.
