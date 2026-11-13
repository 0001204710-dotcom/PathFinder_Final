"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async sfunction main() {
    console.log('🔄 Iniciando semeadura do banco de dados...');
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'adminpathfinder'; 
    const adminPasswordHash = await bcryptjs_1.default.hash(adminPassword, 12);
    // ==========================================
    // 1. CRIAR OU VERIFICAR CONTA ADMINISTRATIVA
    // ==========================================
    const admin = await prisma.usuarios.upsert({
        where: { email: adminEmail },
        update: { senha: adminPasswordHash },
        create: {
            nome: 'Administrador PathFinder',
            email: adminEmail,
            senha: adminPasswordHash,
            telefone: '(11) 99999-9999',
            data_nascimento: new Date('1990-01-01'),
        },
    });
    console.log(`✓ Usuário Admin configurado (${adminEmail})`);
    // ==========================================
    // 2. CONFIGURAR USUÁRIOS COMUNS (JOÃO E PEDRO)
    // ==========================================
    const joao = await prisma.usuarios.upsert({
        where: { email: 'joao.silva@pathfinder.com' },
        update: {},
        create: {
            nome: 'João Silva',
            email: 'joao.silva@pathfinder.com',
            senha: await bcryptjs_1.default.hash('senha123', 12),
            telefone: '(11) 98765-4321',
            data_nascimento: new Date('1985-03-15'),
        },
    });
    const pedro = await prisma.usuarios.upsert({
        where: { email: 'pedro@gmail.com' },
        update: {},
        create: {
            nome: 'Pedro Henrique',
            email: 'pedro@gmail.com',
            senha: await bcryptjs_1.default.hash('senha123', 12),
            telefone: '(11) 91234-5678',
            data_nascimento: new Date('1998-03-20'),
        },
    });
    console.log('✓ Usuários de teste configurados (João e Pedro)');
    // Lista de usuários para injetar a massa de dados clonada para ambos testarem
    const usuariosParaPopular = [joao, pedro];
    for (const user of usuariosParaPopular) {
        // Verificar se este usuário específico já tem dependente para não duplicar no loop
        const possuiDependente = await prisma.dependentes.findFirst({
            where: { usuario_id: user.id }
        });
        if (possuiDependente) {
            console.log(`✓ Dados de teste para ${user.nome} já constavam no sistema.`);
            continue;
        }
        // Criar o dependente ligado ao usuário da vez
        const dependente = await prisma.dependentes.create({
            data: {
                usuario_id: user.id,
                nome: `${user.nome} Filho`,
                data_nascimento: new Date('2015-08-22'),
                genero: 'M',
                Cpf: user.email === 'pedro@gmail.com' ? '98765432100' : '12345678901',
                tipo_sanguineo: 'AB+',
                alergias: 'Dipirona, Poeira',
                observacoes_medicas: 'Monitoramento preventivo de mobilidade',
                url_foto: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nome}`,
            },
        });
        // Injetar Medicamentos
        await prisma.medicamentos.createMany({
            data: [
                {
                    dependente_id: dependente.id,
                    nome: 'Vitamina D3',
                    dosagem: '1 gota',
                    horario: '09:00:00',
                    observacao: 'Tomar pela manhã',
                },
                {
                    dependente_id: dependente.id,
                    nome: 'Suplemento ômega 3',
                    dosagem: '1 cápsula',
                    horario: '13:00:00',
                    observacao: 'Após o almoço',
                }
            ]
        });
        // Criar um medicamento imediato (daqui a 2 min) para o Widget de Próxima Medicação funcionar real
        const nextTime = new Date(Date.now() + 2 * 60000);
        const pad = (n) => String(n).padStart(2, '0');
        const horarioProximo = `${pad(nextTime.getHours())}:${pad(nextTime.getMinutes())}:${pad(nextTime.getSeconds())}`;
        await prisma.medicamentos.create({
            data: {
                dependente_id: dependente.id,
                nome: 'Medicação Teste Realtime',
                dosagem: '1 comprimido',
                horario: horarioProximo,
                observacao: 'Agendado pelo seed dinamicamente',
            },
        });
        // Injetar Alertas ativos para aparecer na dashboard
        await prisma.alertas.createMany({
            data: [
                {
                    dependente_id: dependente.id,
                    tipo: 'bateria',
                    titulo: 'Bateria Restante: 15%',
                    descricao: 'Conecte o dispositivo do dependente ao carregador',
                    prioridade: 'alta',
                    status: 'ativo',
                    data_hora: new Date(Date.now() - 3 * 60000),
                },
                {
                    dependente_id: dependente.id,
                    tipo: 'saúde',
                    titulo: 'Frequência Cardíaca Elevada',
                    descricao: 'Leitura está em 115 BPM em repouso',
                    prioridade: 'media',
                    status: 'ativo',
                    data_hora: new Date(Date.now() - 12 * 60000),
                }
            ]
        });
        // Injetar Histórico de Localizações
        await prisma.localizacoes.create({
            data: {
                dependente_id: dependente.id,
                endereco: 'Av. Paulista, 1000 - São Paulo, SP',
                latitude: -23.561414,
                longitude: -46.6560809,
                data_hora: new Date(),
                atual: true,
            },
        });
        // Injetar Dispositivo Vestível
        await prisma.dispositivos.create({
            data: {
                dependente_id: dependente.id,
                nome: `Pulseira Smart - ${user.nome.split(' ')[0]}`,
                status: 'online',
                bateria: 78,
                gps_online: true,
                ultima_atualizacao: new Date(),
            },
        });
        console.log(`✓ Massa completa de dependentes/dispositivos gerada para: ${user.nome}`);
    }
    console.log('\n✅ Banco de dados atualizado com absoluto sucesso!');
}
main()
    .catch((e) => {
    console.error('❌ Erro crítico ao rodar o seed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
