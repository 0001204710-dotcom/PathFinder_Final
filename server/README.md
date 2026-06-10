# PathFinder - Server

Backend mínimo usando Express + Prisma (MySQL).

Passos rápidos:

1. Instalar dependências:

```bash
cd server
pnpm install
```

2. Gerar cliente Prisma e rodar migração (ajuste o `DATABASE_URL` em `.env`):

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

3. Rodar em desenvolvimento:

```bash
pnpm dev
```

4. Acessar endpoints:

- `GET /api/health`
- `GET /api/dependents`

HeidiSQL: conecte-se ao mesmo banco (host/porta/user/password) definido em `.env`.
