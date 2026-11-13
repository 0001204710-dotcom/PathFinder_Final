import type { PrismaClient } from '@prisma/client';

export const planCatalog = [
  {
    nome: 'Essencial',
    preco_centavos: 2990,
    preco_anual_centavos: 30490,
    max_dependentes: 1,
    descricao: 'Ideal para acompanhar 1 dependente, com recursos de GPS, alertas de emergência, detecção de quedas, proximidade, medicamentos e ficha médica.',
  },
  {
    nome: 'Duplo',
    preco_centavos: 4990,
    preco_anual_centavos: 50990,
    max_dependentes: 2,
    descricao: 'Para famílias que precisam acompanhar até 2 dependentes, com todos os recursos de segurança, localização, alertas, medicamentos e ficha médica.',
  },
  {
    nome: 'Família',
    preco_centavos: 8990,
    preco_anual_centavos: 91990,
    max_dependentes: 6,
    descricao: 'Para famílias que precisam acompanhar até 6 dependentes, com monitoramento, localização, segurança, medicamentos e informações médicas em um único plano.',
  },
  {
    nome: 'Institucional',
    preco_centavos: 29990,
    preco_anual_centavos: 305990,
    max_dependentes: 18,
    descricao: 'Desenvolvido para clínicas e instituições que precisam acompanhar até 18 dependentes, com todos os recursos do sistema e um dashboard exclusivo para gerenciamento centralizado dos usuários e dispositivos.',
  },
] as const;

export async function seedPlanCatalog(prisma: PrismaClient) {
  for (const plan of planCatalog) {
    await prisma.planos.upsert({
      where: { nome: plan.nome },
      update: {
        preco_centavos: plan.preco_centavos,
        preco_anual_centavos: plan.preco_anual_centavos,
        max_dependentes: plan.max_dependentes,
        descricao: plan.descricao,
        ativo: true,
      },
      create: plan,
    });
  }
}
