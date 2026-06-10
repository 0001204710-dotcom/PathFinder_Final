import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './prismaClient';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rota de Health Check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// 1. ROTA DE LISTAR DEPENDENTES (A que tinha sumido!)
app.get('/api/dependentes', async (req, res) => {
  try {
    const dependentes = await prisma.dependentes.findMany({
      include: { medicamentos: true },
    });
    res.json(dependentes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 2. ROTA DE LISTAR MEDICAMENTOS
app.get('/api/medicamentos', async (req, res) => {
  try {
    const medicamentos = await prisma.medicamentos.findMany({
      include: { dependentes: true },
    });
    res.json(medicamentos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// 3. ROTA DE CRIAR DEPENDENTE (Corrigida para calcular o ano com base na idade)
app.post('/api/dependentes', async (req, res) => {
  try {
    const { nome, parentesco, idade, deviceId, url_foto } = req.body;

    // Calcula o ano de nascimento correto
    const idadeNumero = Number(idade);
    const anoAtual = new Date().getFullYear();
    const anoNascimento = !isNaN(idadeNumero) && idadeNumero > 0 ? anoAtual - idadeNumero : anoAtual;
    
    // Formata a data de forma estável para o MySQL
    const dataFormatada = new Date(`${anoNascimento}-01-01T00:00:00.000Z`);

    const novoDependent = await prisma.dependentes.create({
      data: {
        nome,
        data_nascimento: dataFormatada,
        observacoes_medicas: parentesco,
        url_foto: url_foto || null,
      },
      include: { medicamentos: true },
    });

    res.status(201).json(novoDependent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Inicialização do Servidor
const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});