const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Criar usuário de teste, se ainda não existir
  let user = await prisma.usuarios.findUnique({
    where: { email: 'joao.silva@pathfinder.com' }
  });

  if (!user) {
    user = await prisma.usuarios.create({
      data: {
        nome: 'João Silva',
        email: 'joao.silva@pathfinder.com',
        senha: await bcrypt.hash('senha123', 12),
        telefone: '(11) 98765-4321',
        data_nascimento: new Date('1985-03-15'),
      },
    });
  }

  // Criar um dependente de teste ligado ao usuário
  const dependente = await prisma.dependentes.create({
    data: {
      usuario_id: user.id,
      nome: 'João Silva Filho',
      data_nascimento: new Date('2010-05-15'),
      genero: 'M',
      Cpf: '98765432101',
      tipo_sanguineo: 'O+',
      alergias: 'Penicilina, Lactose',
      observacoes_medicas: 'Hipertensão leve, Alergia a pólen',
      url_foto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JohnJunior',
    },
  });

  console.log('✓ Dependente criado:', dependente.nome);

  // Criar medicamentos
  await prisma.medicamentos.create({
    data: {
      dependente_id: dependente.id,
      nome: 'Losartana 50mg',
      dosagem: '1 comprimido',
      horario: new Date('2000-01-01T08:00:00Z'),
      observacao: 'Tomar em jejum',
    },
  });

  await prisma.medicamentos.create({
    data: {
      dependente_id: dependente.id,
      nome: 'Metformina 500mg',
      dosagem: '2 comprimidos',
      horario: '12:30:00',
      observacao: 'Tomar com almoço',
    },
  });

  // Criar medicamento de teste para daqui a 2 minutos
  const nextTime = new Date(Date.now() + 2 * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  const horarioProximo = `${pad(nextTime.getHours())}:${pad(nextTime.getMinutes())}:${pad(nextTime.getSeconds())}`;

  await prisma.medicamentos.create({
    data: {
      dependente_id: dependente.id,
      nome: 'Medicação Teste Imediata',
      dosagem: '1 comprimido',
      horario: horarioProximo,
      observacao: 'Agendada automaticamente pelo seed para teste',
    },
  });

  console.log('✓ Medicamentos criados');

  // Criar alertas
  await prisma.alertas.create({
    data: {
      dependente_id: dependente.id,
      tipo: 'bateria',
      titulo: 'Bateria Baixa',
      descricao: 'A bateria do dispositivo está abaixo de 20%',
      prioridade: 'alta',
      status: 'ativo',
      data_hora: new Date(Date.now() - 5 * 60000),
    },
  });

  await prisma.alertas.create({
    data: {
      dependente_id: dependente.id,
      tipo: 'saúde',
      titulo: 'Pressão Arterial Elevada',
      descricao: 'Leitura: 160/100 mmHg',
      prioridade: 'media',
      status: 'ativo',
      data_hora: new Date(Date.now() - 15 * 60000),
    },
  });

  await prisma.alertas.create({
    data: {
      dependente_id: dependente.id,
      tipo: 'medicamento',
      titulo: 'Medicamento Não Tomado',
      descricao: 'Losartana 50mg não foi tomada no horário',
      prioridade: 'alta',
      status: 'resolvido',
      data_hora: new Date(Date.now() - 2 * 3600000),
    },
  });

  console.log('✓ Alertas criados');

  // Criar localizações
  await prisma.localizacoes.create({
    data: {
      dependente_id: dependente.id,
      endereco: 'Av. Paulista, 1000 - São Paulo, SP',
      latitude: -23.561414,
      longitude: -46.6560809,
      data_hora: new Date(Date.now() - 2 * 60000),
      atual: true,
    },
  });

  await prisma.localizacoes.create({
    data: {
      dependente_id: dependente.id,
      endereco: 'Rua das Flores, 123 - Centro, SP',
      latitude: -23.5505,
      longitude: -46.6333,
      data_hora: new Date(Date.now() - 30 * 60000),
      atual: false,
    },
  });

  console.log('✓ Localizações criadas');

  // Criar dispositivo
  await prisma.dispositivos.create({
    data: {
      dependente_id: dependente.id,
      nome: 'Relógio Inteligente - ID: 12345',
      status: 'online',
      bateria: 45,
      gps_online: true,
      ultima_atualizacao: new Date(Date.now() - 1 * 60000),
    },
  });

  console.log('✓ Dispositivo criado');

  console.log('\n✅ Dados de teste inseridos com sucesso!');
  console.log(`   - Dependente: ${dependente.nome}`);
  console.log(`   - Medicamentos: 3`);
  console.log(`   - Alertas: 3`);
  console.log(`   - Localizações: 2`);
  console.log(`   - Dispositivos: 1`);
}

main()
  .catch((e) => {
    console.error('Erro ao inserir dados:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
