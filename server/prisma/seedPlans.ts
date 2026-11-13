import { PrismaClient } from '@prisma/client';
import { seedPlanCatalog } from './planCatalog';

const prisma = new PrismaClient();

seedPlanCatalog(prisma)
  .then(() => console.log('Planos de assinatura configurados no banco de dados.'))
  .catch((error) => {
    console.error('Erro ao configurar planos no banco de dados:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
