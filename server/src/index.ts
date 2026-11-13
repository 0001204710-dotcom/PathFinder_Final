import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './prismaClient';
import { Prisma } from '@prisma/client';
import arduinoRoutes from './arduino.routes';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'node:crypto';

dotenv.config();

const DEMO_SUBSCRIPTION_DAYS = {
  mensal: 30,
  anual: 365,
} as const;

const DEFAULT_ADMIN_EMAIL = 'admin@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'adminpathfinder';
const LEGACY_ADMIN_EMAIL = 'adminpathfinder@gmail.com';
const LEGACY_ADMIN_PASSWORD = 'acessoadminpathfinder';

const getAdminCredentials = () => ({
  email: String(process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL).trim().toLowerCase(),
  password: String(process.env.ADMIN_SEED_PASSWORD ?? DEFAULT_ADMIN_PASSWORD).trim(),
});

const app = express();
app.use(cors());
app.use(express.json());

const ALERT_TIME_ZONE = 'America/Sao_Paulo';

const getDateTimeParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ALERT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

const getBrasiliaDateString = (date: Date) => {
  const parts = getDateTimeParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const parseBrasiliaDateTime = (date: string, time: string) => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch;
  const [, hour, minute] = timeMatch;
  const utcTime = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const localParts = getDateTimeParts(new Date(utcTime));
  const brasiliaAsUtc = Date.UTC(
    Number(localParts.year),
    Number(localParts.month) - 1,
    Number(localParts.day),
    Number(localParts.hour),
    Number(localParts.minute),
  );
  const result = new Date(utcTime - (brasiliaAsUtc - utcTime));

  if (getBrasiliaDateString(result) !== date) return null;
  const resultParts = getDateTimeParts(result);
  if (`${resultParts.hour}:${resultParts.minute}` !== time) return null;
  return result;
};

const getNextWeeklyOccurrence = (days: number[], time: string, after: Date, startDate?: string) => {
  const afterParts = getDateTimeParts(after);
  const start = startDate ?? `${afterParts.year}-${afterParts.month}-${afterParts.day}`;
  const [year, month, day] = start.split('-').map(Number);
  const firstDay = Date.UTC(year, month - 1, day);

  for (let offset = 0; offset < 8; offset++) {
    const localDate = new Date(firstDay + offset * 24 * 60 * 60 * 1000);
    if (!days.includes(localDate.getUTCDay())) continue;
    const dateString = `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}-${String(localDate.getUTCDate()).padStart(2, '0')}`;
    const occurrence = parseBrasiliaDateTime(dateString, time);
    if (occurrence && occurrence.getTime() > after.getTime()) return occurrence;
  }
  return null;
};

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET precisa estar configurado no ambiente.');
}

const publicUser = (usuario: any) => ({
  id: usuario.id,
  nome: usuario.nome,
  email: usuario.email,
  telefone: usuario.telefone,
  data_nascimento: usuario.data_nascimento,
});

const createToken = (usuario: any, isAdmin = false) => jwt.sign(
  { sub: usuario.id, email: usuario.email, isAdmin },
  jwtSecret,
  { expiresIn: '8h' },
);

app.use('/api', (req, res, next) => {
  const isPublicRoute = req.path === '/health'
    || (req.path === '/plans' && req.method === 'GET')
    || (req.path === '/login' && req.method === 'POST')
    || (req.path === '/admin/login' && req.method === 'POST')
    || (req.path === '/password-recovery/request' && req.method === 'POST')
    || (req.path === '/password-recovery/reset' && req.method === 'POST')
    || (req.path === '/usuarios' && req.method === 'POST');
  if (isPublicRoute) return next();

  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Autenticação necessária.' });

  try {
    (req as any).auth = jwt.verify(token, jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }

  const auth = (req as any).auth;
  const isSubscriptionEndpoint = req.path === '/subscription'
    || (req.path === '/subscription/simulate' && req.method === 'POST');
  if (auth?.isAdmin || isSubscriptionEndpoint) return next();

  prisma.assinaturas.findFirst({
    where: {
      usuario_id: Number(auth?.sub),
      status: 'simulada',
      validade_ate: { gt: new Date() },
    },
    include: { plano: true },
  }).then(async (subscription) => {
    if (subscription?.plano.nome === 'Institucional') {
      auth.institutionalOwnerId = Number(auth.sub);
      auth.institutionalRole = 'owner';
      return next();
    }

    const membership = await prisma.institutional_memberships.findFirst({
      where: { medico_id: Number(auth?.sub), ativo: true },
      include: {
        instituicao: {
          include: {
            assinaturas: {
              where: { status: 'simulada', validade_ate: { gt: new Date() } },
              orderBy: [{ data_criacao: 'desc' }, { id: 'desc' }],
              take: 1,
              include: { plano: true },
            },
          },
        },
      },
    });
    const institutionSubscription = membership?.instituicao.assinaturas[0];
    if (membership && institutionSubscription?.plano.nome === 'Institucional') {
      auth.institutionalOwnerId = membership.instituicao_id;
      auth.institutionalRole = 'doctor';
      return next();
    }

    if (subscription) return next();

    return res.status(402).json({
      code: 'SUBSCRIPTION_REQUIRED',
      error: 'Contrate um plano para acessar os recursos do PathFinder.',
    });
  }).catch((error) => {
    console.error('Erro ao verificar assinatura do usuário:', error);
    return res.status(500).json({ error: 'Não foi possível validar a assinatura.' });
  });
});

const requestIsAdmin = (req: express.Request) => Boolean((req as any).auth?.isAdmin);
const requestUserId = (req: express.Request) => Number((req as any).auth?.sub);
const requestInstitutionId = (req: express.Request) => Number((req as any).auth?.institutionalOwnerId);
const requestInstitutionRole = (req: express.Request) => (req as any).auth?.institutionalRole as string | undefined;
const dependentAccessWhere = (req: express.Request, id: number) => ({
  id,
  ...(requestIsAdmin(req) ? {} : { usuario_id: requestUserId(req) }),
});

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!requestIsAdmin(req)) return res.status(403).json({ error: 'Acesso administrativo necessário.' });
  return next();
};

const requireInstitutionalOwner = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!requestInstitutionId(req) || requestInstitutionRole(req) !== 'owner') {
    return res.status(403).json({ error: 'Acesso de gestor institucional necessário.' });
  }
  return next();
};

app.get('/api/plans', async (_req, res) => {
  try {
    const plans = await prisma.planos.findMany({
      where: { ativo: true },
      orderBy: { preco_centavos: 'asc' },
    });
    res.json(plans);
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    res.status(500).json({ error: 'Erro ao carregar os planos.' });
  }
});

app.get('/api/subscription', async (req, res) => {
  try {
    const subscription = await prisma.assinaturas.findFirst({
      where: { usuario_id: requestUserId(req) },
      orderBy: [{ data_criacao: 'desc' }, { id: 'desc' }],
      include: { plano: true },
    });
    const expired = subscription
      && subscription.status === 'simulada'
      && subscription.validade_ate <= new Date();

    res.json({
      assinatura: subscription ? {
        ...subscription,
        status: expired ? 'expirada' : subscription.status,
        simulacao: true,
        cobranca_real: false,
      } : null,
    });
  } catch (error) {
    console.error('Erro ao consultar assinatura:', error);
    res.status(500).json({ error: 'Erro ao consultar a assinatura.' });
  }
});

app.post('/api/subscription/simulate', async (req, res) => {
  try {
    if (requestIsAdmin(req)) {
      return res.status(403).json({ error: 'Administradores não podem contratar planos de usuário.' });
    }

    const planId = Number(req.body?.planId);
    if (!Number.isInteger(planId) || planId <= 0) {
      return res.status(400).json({ error: 'Selecione um plano válido.' });
    }
    const requestedBillingCycle: unknown = req.body?.billingCycle;
    if (requestedBillingCycle !== 'mensal' && requestedBillingCycle !== 'anual') {
      return res.status(400).json({ error: 'Selecione um ciclo de cobrança válido.' });
    }
    const billingCycle = requestedBillingCycle;

    const plan = await prisma.planos.findFirst({ where: { id: planId, ativo: true } });
    if (!plan) return res.status(404).json({ error: 'Plano não encontrado.' });
    const priceCents = billingCycle === 'anual' ? plan.preco_anual_centavos : plan.preco_centavos;
    if (priceCents <= 0) return res.status(400).json({ error: 'O ciclo anual ainda não está disponível para este plano.' });

    const userId = requestUserId(req);
    const dependentCount = await prisma.dependentes.count({ where: { usuario_id: userId } });
    if (dependentCount > plan.max_dependentes) {
      return res.status(409).json({
        error: `Este plano permite até ${plan.max_dependentes} dependente(s), mas sua conta já possui ${dependentCount}.`,
      });
    }

    const start = new Date();
    const expiresAt = new Date(start);
    expiresAt.setDate(expiresAt.getDate() + DEMO_SUBSCRIPTION_DAYS[billingCycle]);

    const subscription = await prisma.$transaction(async (transaction) => {
      await transaction.assinaturas.updateMany({
        where: { usuario_id: userId, status: 'simulada' },
        data: { status: 'substituida' },
      });
      return transaction.assinaturas.create({
        data: {
          usuario_id: userId,
          plano_id: plan.id,
          status: 'simulada',
          ciclo_cobranca: billingCycle,
          valor_centavos: priceCents,
          inicio: start,
          validade_ate: expiresAt,
        },
        include: { plano: true },
      });
    });

    return res.status(201).json({
      assinatura: subscription,
      simulacao: true,
      cobranca_real: false,
      mensagem: 'Plano ativado em modo de demonstração. Nenhuma cobrança ou transação financeira foi realizada.',
    });
  } catch (error) {
    console.error('Erro ao simular contratação:', error);
    return res.status(500).json({ error: 'Não foi possível registrar a contratação demonstrativa.' });
  }
});

app.get('/api/institutional/dashboard', async (req, res) => {
  const institutionId = requestInstitutionId(req);
  if (!institutionId || requestInstitutionRole(req) === undefined) {
    return res.status(403).json({ error: 'Este painel está disponível apenas para uma instituição ativa.' });
  }

  try {
    const isOwner = requestInstitutionRole(req) === 'owner';
    const doctorId = requestUserId(req);
    const dependentScope = isOwner
      ? { usuario_id: institutionId }
      : {
        usuario_id: institutionId,
        OR: [
          { medico_institucional_id: doctorId },
          { grupo_institucional: { medico_id: doctorId }, medico_institucional_id: null },
        ],
      };
    const [dependents, doctors, groups, activeAlertCount, institution, user] = await Promise.all([
      prisma.dependentes.findMany({
        where: dependentScope,
        select: {
          id: true,
          nome: true,
          data_nascimento: true,
          medico_institucional_id: true,
          grupo_institucional_id: true,
          medico_institucional: { select: { id: true, nome: true } },
          grupo_institucional: {
            select: { id: true, nome: true, medico: { select: { id: true, nome: true } } },
          },
          dispositivos: {
            select: { id: true, nome: true, status: true, bateria: true, gps_online: true, ultima_atualizacao: true },
          },
          alertas: {
            where: { status: { not: 'resolvido' } },
            select: { id: true, titulo: true, prioridade: true, status: true, data_hora: true },
            orderBy: { data_hora: 'desc' },
            take: 5,
          },
        },
        orderBy: { nome: 'asc' },
      }),
      isOwner
        ? prisma.institutional_memberships.findMany({
          where: { instituicao_id: institutionId, ativo: true },
          select: {
            medico: { select: { id: true, nome: true, email: true, telefone: true } },
            especialidade: true,
          },
          orderBy: { medico: { nome: 'asc' } },
        })
        : Promise.resolve([]),
      prisma.institutional_groups.findMany({
        where: isOwner ? { instituicao_id: institutionId } : { instituicao_id: institutionId, medico_id: doctorId },
        select: {
          id: true,
          nome: true,
          medico_id: true,
          medico: { select: { id: true, nome: true } },
          dependentes: { select: { id: true } },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.alertas.count({
        where: {
          status: { not: 'resolvido' },
          dependente: { is: dependentScope },
        },
      }),
      prisma.usuarios.findUnique({
        where: { id: institutionId },
        select: { id: true, nome: true, email: true, telefone: true },
      }),
      prisma.usuarios.findUnique({
        where: { id: doctorId },
        select: { id: true, nome: true, email: true },
      }),
    ]);

    return res.json({
      role: requestInstitutionRole(req),
      institution,
      user,
      dependents,
      activeAlertCount,
      doctors: doctors.map((membership) => ({ ...membership.medico, especialidade: membership.especialidade })),
      groups: groups.map((group) => ({ ...group, dependentCount: group.dependentes.length, dependentes: undefined })),
    });
  } catch (error) {
    console.error('Erro ao carregar o painel institucional:', error);
    return res.status(500).json({ error: 'Não foi possível carregar o painel institucional.' });
  }
});

app.put('/api/institutional/profile', requireInstitutionalOwner, async (req, res) => {
  const institutionId = requestInstitutionId(req);
  const nome = String(req.body?.nome ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const telefone = String(req.body?.telefone ?? '').trim();

  if (!nome || nome.length > 150) {
    return res.status(400).json({ error: 'Informe um nome para a instituição, com até 150 caracteres.' });
  }
  if (!email.endsWith('@gmail.com')) {
    return res.status(400).json({ error: 'O e-mail de acesso deve ser do domínio @gmail.com.' });
  }
  if (telefone.length > 20) {
    return res.status(400).json({ error: 'O telefone deve ter até 20 caracteres.' });
  }

  try {
    const institution = await prisma.usuarios.update({
      where: { id: institutionId },
      data: { nome, email, telefone: telefone || null },
      select: { id: true, nome: true, email: true, telefone: true },
    });
    return res.json({ institution });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'Este e-mail já está sendo usado por outra conta.' });
    }
    console.error('Erro ao atualizar o perfil institucional:', error);
    return res.status(500).json({ error: 'Não foi possível atualizar o perfil da instituição.' });
  }
});

app.post('/api/institutional/doctors', requireInstitutionalOwner, async (req, res) => {
  const institutionId = requestInstitutionId(req);
  const nome = String(req.body?.nome ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const senha = String(req.body?.senha ?? '');
  const especialidade = String(req.body?.especialidade ?? '').trim();

  if (!nome || !email || senha.length < 8) {
    return res.status(400).json({ error: 'Informe nome, e-mail e uma senha com pelo menos 8 caracteres.' });
  }
  if (!email.endsWith('@gmail.com')) {
    return res.status(400).json({ error: 'O e-mail do médico deve ser do domínio @gmail.com.' });
  }

  try {
    const existingUser = await prisma.usuarios.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'Este e-mail já possui uma conta PathFinder.' });

    const doctor = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.usuarios.create({
        data: { nome, email, senha: await bcrypt.hash(senha, 12) },
        select: { id: true, nome: true, email: true },
      });
      await transaction.institutional_memberships.create({
        data: {
          instituicao_id: institutionId,
          medico_id: createdUser.id,
          especialidade: especialidade || null,
        },
      });
      return createdUser;
    });

    return res.status(201).json({ ...doctor, especialidade: especialidade || null });
  } catch (error) {
    console.error('Erro ao cadastrar profissional institucional:', error);
    return res.status(500).json({ error: 'Não foi possível cadastrar o profissional.' });
  }
});

app.put('/api/institutional/doctors/:doctorId', requireInstitutionalOwner, async (req, res) => {
  const institutionId = requestInstitutionId(req);
  const doctorId = Number(req.params.doctorId);
  const nome = String(req.body?.nome ?? '').trim();
  const especialidade = String(req.body?.especialidade ?? '').trim();

  if (!Number.isInteger(doctorId) || doctorId <= 0) {
    return res.status(400).json({ error: 'Profissional inválido.' });
  }
  if (!nome || nome.length > 150) {
    return res.status(400).json({ error: 'Informe um nome com até 150 caracteres.' });
  }
  if (especialidade.length > 100) {
    return res.status(400).json({ error: 'A especialidade deve ter até 100 caracteres.' });
  }

  try {
    const updatedDoctor = await prisma.$transaction(async (transaction) => {
      const membership = await transaction.institutional_memberships.findFirst({
        where: { instituicao_id: institutionId, medico_id: doctorId, ativo: true },
        select: { id: true },
      });
      if (!membership) return null;

      const doctor = await transaction.usuarios.update({
        where: { id: doctorId },
        data: { nome },
        select: { id: true, nome: true, email: true, telefone: true },
      });
      await transaction.institutional_memberships.update({
        where: { id: membership.id },
        data: { especialidade: especialidade || null },
      });
      return { ...doctor, especialidade: especialidade || null };
    });

    if (!updatedDoctor) {
      return res.status(404).json({ error: 'Profissional não encontrado nesta instituição.' });
    }
    return res.json(updatedDoctor);
  } catch (error) {
    console.error('Erro ao atualizar profissional institucional:', error);
    return res.status(500).json({ error: 'Não foi possível atualizar o profissional.' });
  }
});

app.post('/api/institutional/groups', requireInstitutionalOwner, async (req, res) => {
  const institutionId = requestInstitutionId(req);
  const nome = String(req.body?.nome ?? '').trim();
  const doctorId = req.body?.medicoId == null || req.body.medicoId === '' ? null : Number(req.body.medicoId);
  const requestedDependentIds: unknown = req.body?.dependentIds;
  const dependentIds = Array.isArray(requestedDependentIds)
    ? [...new Set(requestedDependentIds.reduce<number[]>((ids, value) => {
      const id = Number(value);
      if (Number.isInteger(id) && id > 0) ids.push(id);
      return ids;
    }, []))]
    : [];

  if (!nome || nome.length > 100) return res.status(400).json({ error: 'Informe um nome de grupo com até 100 caracteres.' });

  try {
    if (doctorId !== null) {
      const membership = await prisma.institutional_memberships.findFirst({
        where: { instituicao_id: institutionId, medico_id: doctorId, ativo: true },
      });
      if (!membership) return res.status(400).json({ error: 'Selecione um profissional desta instituição.' });
    }
    if (dependentIds.length) {
      const ownedCount = await prisma.dependentes.count({
        where: { usuario_id: institutionId, id: { in: dependentIds } },
      });
      if (ownedCount !== dependentIds.length) {
        return res.status(400).json({ error: 'Um ou mais dependentes não pertencem a esta instituição.' });
      }
    }

    const group = await prisma.$transaction(async (transaction) => {
      const createdGroup = await transaction.institutional_groups.create({
        data: { instituicao_id: institutionId, nome, medico_id: doctorId },
      });
      if (dependentIds.length) {
        await transaction.dependentes.updateMany({
          where: { usuario_id: institutionId, id: { in: dependentIds } },
          data: { grupo_institucional_id: createdGroup.id },
        });
      }
      return createdGroup;
    });

    return res.status(201).json(group);
  } catch (error) {
    console.error('Erro ao criar grupo institucional:', error);
    return res.status(500).json({ error: 'Não foi possível criar o grupo.' });
  }
});

app.patch('/api/institutional/dependents/:id/assignment', requireInstitutionalOwner, async (req, res) => {
  const institutionId = requestInstitutionId(req);
  const dependentId = Number(req.params.id);
  const doctorId = req.body?.medicoId == null || req.body.medicoId === '' ? null : Number(req.body.medicoId);
  const groupId = req.body?.grupoId == null || req.body.grupoId === '' ? null : Number(req.body.grupoId);

  if (!Number.isInteger(dependentId) || dependentId <= 0) {
    return res.status(400).json({ error: 'Dependente inválido.' });
  }

  try {
    const dependent = await prisma.dependentes.findFirst({
      where: { id: dependentId, usuario_id: institutionId },
      select: { id: true },
    });
    if (!dependent) return res.status(404).json({ error: 'Dependente não encontrado nesta instituição.' });

    if (doctorId !== null) {
      const membership = await prisma.institutional_memberships.findFirst({
        where: { instituicao_id: institutionId, medico_id: doctorId, ativo: true },
      });
      if (!membership) return res.status(400).json({ error: 'Selecione um profissional desta instituição.' });
    }
    if (groupId !== null) {
      const group = await prisma.institutional_groups.findFirst({
        where: { id: groupId, instituicao_id: institutionId },
      });
      if (!group) return res.status(400).json({ error: 'Selecione um grupo desta instituição.' });
    }

    const updated = await prisma.dependentes.update({
      where: { id: dependentId },
      data: { medico_institucional_id: doctorId, grupo_institucional_id: groupId },
      select: {
        id: true,
        medico_institucional: { select: { id: true, nome: true } },
        grupo_institucional: { select: { id: true, nome: true } },
      },
    });
    return res.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar a equipe responsável pelo dependente:', error);
    return res.status(500).json({ error: 'Não foi possível atualizar a atribuição.' });
  }
});

app.patch('/api/institutional/alerts/:id', async (req, res) => {
  const institutionId = requestInstitutionId(req);
  const role = requestInstitutionRole(req);
  const alertId = Number(req.params.id);
  if (!institutionId || (role !== 'owner' && role !== 'doctor')) {
    return res.status(403).json({ error: 'Acesso institucional necessário.' });
  }
  if (!Number.isInteger(alertId) || alertId <= 0 || req.body?.status !== 'resolvido') {
    return res.status(400).json({ error: 'Ação ou alerta inválido.' });
  }

  try {
    const isOwner = role === 'owner';
    const doctorId = requestUserId(req);
    const dependentScope = isOwner
      ? { usuario_id: institutionId }
      : {
        usuario_id: institutionId,
        OR: [
          { medico_institucional_id: doctorId },
          { grupo_institucional: { medico_id: doctorId }, medico_institucional_id: null },
        ],
      };
    const alert = await prisma.alertas.findFirst({
      where: { id: alertId, dependente: { is: dependentScope } },
      select: { id: true },
    });
    if (!alert) return res.status(404).json({ error: 'Alerta não encontrado no seu escopo institucional.' });

    const updatedAlert = await prisma.alertas.update({
      where: { id: alert.id },
      data: { status: 'resolvido' },
      select: { id: true, status: true, data_hora: true },
    });
    return res.json(updatedAlert);
  } catch (error) {
    console.error('Erro ao resolver alerta institucional:', error);
    return res.status(500).json({ error: 'Não foi possível atualizar o alerta.' });
  }
});

// ======== CONFIGURAÇÕES GLOBAIS ========
let systemConfig = {
  emailNotifications: true,
  backupEnabled: true,
  maintenanceMode: false,
  twoFactorRequired: true,
  emailServer: {
    host: 'smtp.gmail.com',
    port: '587',
    username: 'pathfinder@example.com',
    password: '',
  },
  backupSchedule: 'diária',
  apiRateLimit: '1000',
};

const RECOVERY_CODE_TTL_MS = 15 * 60 * 1000;
const RECOVERY_REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_RECOVERY_ATTEMPTS = 5;

const hashRecoveryCode = (code: string) => bcrypt.hash(code, 10);

const findRecoveryUser = async (identifier: string, allowPhone: boolean) => {
  const normalized = identifier.trim();
  if (normalized.includes('@')) {
    return prisma.usuarios.findUnique({ where: { email: normalized.toLowerCase() } });
  }
  if (!allowPhone) return null;
  return prisma.usuarios.findFirst({ where: { telefone: normalized } });
};

const updatePasswordUsingRecoveryCode = async (
  userId: number,
  code: string,
  password: string,
  additionalData: Prisma.usuariosUpdateManyMutationInput = {},
) => {
  const usuario = await prisma.usuarios.findUnique({
    where: { id: userId },
    select: {
      codigo_recuperacao_hash: true,
      codigo_recuperacao_expira: true,
      tentativas_recuperacao: true,
    },
  });
  const now = new Date();
  if (
    !usuario?.codigo_recuperacao_hash
    || !usuario.codigo_recuperacao_expira
    || usuario.codigo_recuperacao_expira <= now
    || usuario.tentativas_recuperacao >= MAX_RECOVERY_ATTEMPTS
  ) return false;

  const recoveryWhere = {
    id: userId,
    codigo_recuperacao_hash: usuario.codigo_recuperacao_hash,
    codigo_recuperacao_expira: { gt: now },
    tentativas_recuperacao: usuario.tentativas_recuperacao,
  };
  if (!await bcrypt.compare(code, usuario.codigo_recuperacao_hash)) {
    const attemptUpdate = usuario.tentativas_recuperacao + 1 >= MAX_RECOVERY_ATTEMPTS
      ? {
          codigo_recuperacao_hash: null,
          codigo_recuperacao_expira: null,
          codigo_recuperacao_enviado_em: null,
          tentativas_recuperacao: 0,
        }
      : { tentativas_recuperacao: { increment: 1 } };
    await prisma.usuarios.updateMany({ where: recoveryWhere, data: attemptUpdate });
    return false;
  }

  const result = await prisma.usuarios.updateMany({
    where: recoveryWhere,
    data: {
      ...additionalData,
      senha: await bcrypt.hash(password, 12),
      codigo_recuperacao_hash: null,
      codigo_recuperacao_expira: null,
      codigo_recuperacao_enviado_em: null,
      tentativas_recuperacao: 0,
    },
  });
  return result.count === 1;
};

// Rota de Health Check
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/arduino', arduinoRoutes);

// ======== ROTAS DE DEPENDENTES ========

const normalizeHeight = (height: number | null | undefined) => {
  if (height === null || height === undefined) return height;
  return height > 0 && height < 10 ? height * 100 : height;
};

const isFullName = (value: unknown): value is string =>
  typeof value === 'string'
  && value.trim().split(/\s+/u).filter((part) => /\p{L}/u.test(part)).length >= 2;

const validateHeight = (height: unknown) => {
  if (height === null || height === undefined || height === '') return null;
  const parsedHeight = Number(height);
  return Number.isFinite(parsedHeight) && parsedHeight >= 100 && parsedHeight <= 230
    ? parsedHeight
    : undefined;
};

// 0. BUSCAR TODOS OS DEPENDENTES (Faltava esta rota!)
app.get('/api/dependentes', async (req, res) => {
  try {
    const dependentes = await prisma.dependentes.findMany({
      where: requestIsAdmin(req) ? undefined : { usuario_id: requestUserId(req) },
      include: { medicamentos: true, alertas: true, localizacoes: true, dispositivos: true },
    });
    res.json(dependentes.map((dependent) => ({
      ...dependent,
      altura: normalizeHeight(dependent.altura),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar dependentes' });
  }
});

// 1. CADASTRAR DEPENDENTE (E DISPOSITIVO SE HOUVER)
app.post('/api/dependentes', async (req, res) => {
  try {
    const {
      usuario_id,
      nome,
      data_nascimento,
      genero,
      Cpf,
      tipo_sanguineo,
      peso,
      altura,
      alergias,
      observacoes_medicas,
      url_foto,
      // Dados do dispositivo IoT:
      id_dispositivo,
      status_gps,
      nivel_bateria
    } = req.body;

    if (!isFullName(nome)) {
      return res.status(400).json({ error: 'Informe o nome completo do dependente, incluindo nome e sobrenome.' });
    }
    const nomeCompleto = nome.trim().replace(/\s+/g, ' ');

    // Garante que temos um usuario_id válido buscando o primeiro disponível se o enviado falhar
    let usuarioId = requestIsAdmin(req) ? Number(usuario_id) : requestUserId(req);
    if (!usuarioId || Number.isNaN(usuarioId)) {
      if (!requestIsAdmin(req)) {
        return res.status(401).json({ error: 'Usuário autenticado inválido.' });
      }
      const primeiroUsuario = await prisma.usuarios.findFirst({ orderBy: { id: 'asc' } });
      usuarioId = primeiroUsuario ? primeiroUsuario.id : 1;
    }

    const activeSubscription = await prisma.assinaturas.findFirst({
      where: {
        usuario_id: usuarioId,
        status: 'simulada',
        validade_ate: { gt: new Date() },
      },
      orderBy: [{ data_criacao: 'desc' }, { id: 'desc' }],
      include: { plano: true },
    });
    if (!activeSubscription) {
      return res.status(402).json({ error: 'É necessário contratar um plano antes de cadastrar dependentes.' });
    }

    const dependentCount = await prisma.dependentes.count({ where: { usuario_id: usuarioId } });
    if (dependentCount >= activeSubscription.plano.max_dependentes) {
      return res.status(409).json({
        error: `O plano ${activeSubscription.plano.nome} permite até ${activeSubscription.plano.max_dependentes} dependente(s).`,
      });
    }

    // Converter ISO string para apenas a data (YYYY-MM-DD) que o MySQL DATE espera
    let birthDate = new Date();
    if (data_nascimento) {
      const dateObj = new Date(data_nascimento);
      const dateStr = dateObj.toISOString().split('T')[0]; // Extrai YYYY-MM-DD
      birthDate = new Date(dateStr + 'T00:00:00.000Z'); // Converte de volta para Date
    }

    const validatedHeight = validateHeight(altura);
    if (validatedHeight === undefined) {
      return res.status(400).json({ error: 'A altura deve estar entre 100 e 230 cm.' });
    }

    // 1. Cria primeiro o Dependente na tabela correta
    const novoDependente = await prisma.dependentes.create({
      data: {
        usuario_id: usuarioId,
        nome: nomeCompleto,
        data_nascimento: birthDate,
        genero: genero || null,
        Cpf: Cpf || null,
        tipo_sanguineo: tipo_sanguineo || null,
        peso: peso ? Number(peso) : null,
        altura: validatedHeight,
        alergias: alergias || null, // CORRIGIDO: Removido o 'allergies' que quebrava o backend
        observacoes_medicas: observacoes_medicas || null,
        url_foto: url_foto || null,
      },
      include: { medicamentos: true },
    });

    // 2. Se o utilizador preencheu um Dispositivo, cria-o e liga-o a este dependente
    if (id_dispositivo && id_dispositivo.trim() !== '' && id_dispositivo !== 'PF-') {
      await prisma.dispositivos.create({
        data: {
          dependente_id: novoDependente.id,
          nome: id_dispositivo,
          status: status_gps || 'online',
          bateria: nivel_bateria || 100,
          gps_online: status_gps === 'online',
          ultima_atualizacao: new Date()
        }
      });
    }

    // 3. Responde com sucesso
    return res.status(201).json({
      ...novoDependente,
      altura: normalizeHeight(novoDependente.altura),
    });
    
  } catch (error) {
    console.error("Erro crítico ao cadastrar dependente:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(400).json({ error: 'CPF já cadastrado ou valor duplicado.' });
    }
    return res.status(500).json({ error: "Erro interno no servidor ao guardar os dados." });
  }
});

app.get('/api/dependentes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const dependente = await prisma.dependentes.findFirst({
      where: dependentAccessWhere(req, id),
      include: { medicamentos: true, alertas: true, localizacoes: true, dispositivos: true },
    });

    if (!dependente) {
      return res.status(404).json({ error: 'Dependente não encontrado' });
    }

    res.json({
      ...dependente,
      altura: normalizeHeight(dependente.altura),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/dependentes/:id/ficha-medica', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const dependente = await prisma.dependentes.findFirst({
      where: dependentAccessWhere(req, id),
      include: { medicamentos: true },
    });

    if (!dependente) {
      return res.status(404).json({ error: 'Dependente não encontrado' });
    }

    const hoje = new Date();
    const dataNascimento = new Date(dependente.data_nascimento);
    let idade = hoje.getUTCFullYear() - dataNascimento.getUTCFullYear();
    const mes = hoje.getUTCMonth() - dataNascimento.getUTCMonth();
    if (mes < 0 || (mes === 0 && hoje.getUTCDate() < dataNascimento.getUTCDate())) {
      idade--;
    }

    res.json({
      id: dependente.id,
      nome: dependente.nome,
      idade,
      data_nascimento: dependente.data_nascimento,
      genero: dependente.genero,
      tipo_sanguineo: dependente.tipo_sanguineo,
      alergias: dependente.alergias,
      observacoes_medicas: dependente.observacoes_medicas,
      peso: dependente.peso,
      altura: normalizeHeight(dependente.altura),
      medicamentos: dependente.medicamentos,
      url_foto: dependente.url_foto,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.put('/api/dependentes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, data_nascimento, genero, Cpf, tipo_sanguineo, peso, altura, alergias, observacoes_medicas, url_foto } = req.body;

    if (nome !== undefined && !isFullName(nome)) {
      return res.status(400).json({ error: 'Informe o nome completo do dependente, incluindo nome e sobrenome.' });
    }

    const validatedHeight = validateHeight(altura);
    if (validatedHeight === undefined) {
      return res.status(400).json({ error: 'A altura deve estar entre 100 e 230 cm.' });
    }

    const data: any = {};

    if (nome !== undefined) data.nome = nome.trim().replace(/\s+/g, ' ');
    if (data_nascimento) data.data_nascimento = new Date(data_nascimento);
    if (genero !== undefined) data.genero = genero || null;
    if (Cpf !== undefined) data.Cpf = Cpf || null;
    if (tipo_sanguineo !== undefined) data.tipo_sanguineo = tipo_sanguineo || null;
    if (peso !== undefined) data.peso = peso ? Number(peso) : null;
    if (altura !== undefined) data.altura = validatedHeight;
    if (alergias !== undefined) data.alergias = alergias || null;
    if (observacoes_medicas !== undefined) data.observacoes_medicas = observacoes_medicas || null;
    if (url_foto !== undefined) data.url_foto = url_foto || null;

    const ownedDependent = await prisma.dependentes.findFirst({ where: dependentAccessWhere(req, id) });
    if (!ownedDependent) return res.status(404).json({ error: 'Dependente não encontrado' });

    const updatedDependent = await prisma.dependentes.update({
      where: { id },
      data,
      include: { medicamentos: true },
    });

    res.json(updatedDependent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.delete('/api/dependentes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const ownedDependent = await prisma.dependentes.findFirst({ where: dependentAccessWhere(req, id) });
    if (!ownedDependent) return res.status(404).json({ error: 'Dependente não encontrado' });
    await prisma.$transaction(async (transaction) => {
      await transaction.contatos_emergencia.deleteMany({ where: { dependente_id: id } });
      await transaction.medicamentos.deleteMany({ where: { dependente_id: id } });
      await transaction.alertas.deleteMany({ where: { dependente_id: id } });
      await transaction.localizacoes.deleteMany({ where: { dependente_id: id } });
      await transaction.dispositivos.deleteMany({ where: { dependente_id: id } });
      await transaction.dependentes.delete({ where: { id } });
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});


// ======== ROTAS DE MEDICAMENTOS ========

app.get('/api/medicamentos', async (req, res) => {
  try {
    const medicamentos = await prisma.medicamentos.findMany({
      where: requestIsAdmin(req) ? undefined : { dependentes: { usuario_id: requestUserId(req) } },
      include: { dependentes: true },
    });
    res.json(medicamentos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/dependentes/:id/medicamentos', async (req, res) => {
  try {
    const dependenteId = Number(req.params.id);
    const { nome, dosagem, horario, observacao } = req.body;
    const dependent = await prisma.dependentes.findFirst({ where: dependentAccessWhere(req, dependenteId) });
    if (!dependent) return res.status(404).json({ error: 'Dependente não encontrado' });

    const medicamento = await prisma.medicamentos.create({
      data: {
        dependente_id: dependenteId,
        nome,
        dosagem: dosagem || null,
        horario: horario || null,
        observacao: observacao || null,
      },
    });

    res.status(201).json(medicamento);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.put('/api/medicamentos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, dosagem, horario, observacao } = req.body;
    const medication = await prisma.medicamentos.findFirst({
      where: { id, ...(requestIsAdmin(req) ? {} : { dependentes: { usuario_id: requestUserId(req) } }) },
    });
    if (!medication) return res.status(404).json({ error: 'Medicamento não encontrado' });

    const updated = await prisma.medicamentos.update({
      where: { id },
      data: {
        nome,
        dosagem: dosagem ?? null,
        horario: horario ?? null,
        observacao: observacao ?? null,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.delete('/api/medicamentos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const medication = await prisma.medicamentos.findFirst({
      where: { id, ...(requestIsAdmin(req) ? {} : { dependentes: { usuario_id: requestUserId(req) } }) },
    });
    if (!medication) return res.status(404).json({ error: 'Medicamento não encontrado' });
    await prisma.medicamentos.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/medicamentos/:id/snooze', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { minutes } = req.body;
    const med = await prisma.medicamentos.findFirst({
      where: { id, ...(requestIsAdmin(req) ? {} : { dependentes: { usuario_id: requestUserId(req) } }) },
    });
    if (!med) return res.status(404).json({ error: 'Medicamento não encontrado' });

    const alerta = await prisma.alertas.create({
      data: {
        dependente_id: med.dependente_id ?? null,
        tipo: 'medicamento',
        titulo: `Medicamento adiado ${minutes} minutos`,
        descricao: `O medicamento ${med.nome} foi adiado por ${minutes} minutos.`,
        prioridade: 'media',
        status: 'ativo',
        data_hora: new Date(),
      },
    });

    res.json({ ok: true, alerta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// ======== ROTAS DE CONTATOS DE EMERGÊNCIA ========

app.get('/api/dependentes/:id/contatos-emergencia', async (req, res) => {
  try {
    const dependenteId = Number(req.params.id);
    const dependent = await prisma.dependentes.findFirst({ where: dependentAccessWhere(req, dependenteId) });
    if (!dependent) return res.status(404).json({ error: 'Dependente não encontrado' });
    const contatos = await prisma.contatos_emergencia.findMany({
      where: { dependente_id: dependenteId },
      orderBy: { id: 'asc' },
    });
    res.json(contatos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar contatos de emergência' });
  }
});

app.post('/api/dependentes/:id/contatos-emergencia', async (req, res) => {
  try {
    const dependenteId = Number(req.params.id);
    const { nome, telefone, relacao } = req.body;
    const dependent = await prisma.dependentes.findFirst({ where: dependentAccessWhere(req, dependenteId) });
    if (!dependent) return res.status(404).json({ error: 'Dependente não encontrado' });
    const contato = await prisma.contatos_emergencia.create({
      data: { dependente_id: dependenteId, nome, telefone, relacao },
    });
    res.status(201).json(contato);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar contato de emergência' });
  }
});

app.delete('/api/contatos-emergencia/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const contact = await prisma.contatos_emergencia.findFirst({
      where: { id, ...(requestIsAdmin(req) ? {} : { dependente: { usuario_id: requestUserId(req) } }) },
    });
    if (!contact) return res.status(404).json({ error: 'Contato não encontrado' });
    await prisma.contatos_emergencia.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar contato de emergência' });
  }
});



// ======== ROTAS DO DASHBOARD E ALERTAS ========

app.get('/api/dashboard', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dependenteId = req.query.dependente_id ? Number(req.query.dependente_id) : null;

    const device = await prisma.dispositivos.findFirst({
      where: {
        ...(dependenteId ? { dependente_id: dependenteId } : {}),
        ...(requestIsAdmin(req) ? {} : { dependente: { usuario_id: requestUserId(req) } }),
      },
      orderBy: { ultima_atualizacao: 'desc' },
      include: { dependente: true },
    });

    const recentAlerts = await prisma.alertas.findMany({
      where: {
        ...(dependenteId ? { dependente_id: dependenteId } : {}),
        ...(requestIsAdmin(req) ? {} : { dependente: { usuario_id: requestUserId(req) } }),
      },
      orderBy: { data_hora: 'desc' },
      take: 5,
      include: { dependente: true },
    });

    const lastLocation = await prisma.localizacoes.findFirst({
      where: {
        ...(dependenteId ? { dependente_id: dependenteId } : {}),
        ...(requestIsAdmin(req) ? {} : { dependente: { usuario_id: requestUserId(req) } }),
      },
      orderBy: [
        { atual: 'desc' },
        { data_hora: 'desc' },
      ],
      include: { dependente: true },
    });

    const medications = await prisma.medicamentos.findMany({
      where: {
        ...(dependenteId ? { dependente_id: dependenteId } : {}),
        ...(requestIsAdmin(req) ? {} : { dependentes: { usuario_id: requestUserId(req) } }),
      },
      include: { dependentes: true },
    });
    
    const now = new Date();
    const scheduledMedications = medications
      .map((med) => {
        if (!med.horario) return null;
        const [hours, minutes, seconds] = med.horario.split(':').map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

        const scheduledAt = new Date(now);
        scheduledAt.setHours(hours, minutes, seconds || 0, 0);
        if (scheduledAt.getTime() < now.getTime()) {
          scheduledAt.setDate(scheduledAt.getDate() + 1);
        }

        return {
          ...med,
          scheduledAt,
        };
      })
      .filter((med): med is typeof medications[number] & { scheduledAt: Date } => med !== null)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    const nextMedication = scheduledMedications.length
      ? {
          id: scheduledMedications[0].id,
          nome: scheduledMedications[0].nome,
          dosagem: scheduledMedications[0].dosagem,
          horario: scheduledMedications[0].horario,
          dependente_id: scheduledMedications[0].dependente_id,
        }
      : null;

    const alertsTodayCount = await prisma.alertas.count({
      where: {
        ...(dependenteId ? { dependente_id: dependenteId } : {}),
        ...(requestIsAdmin(req) ? {} : { dependente: { usuario_id: requestUserId(req) } }),
        data_hora: {
          gte: today,
        },
      },
    });

    const alertsActiveCount = await prisma.alertas.count({
      where: {
        ...(dependenteId ? { dependente_id: dependenteId } : {}),
        ...(requestIsAdmin(req) ? {} : { dependente: { usuario_id: requestUserId(req) } }),
        status: 'ativo',
      },
    });

    const alertsResolvedCount = await prisma.alertas.count({
      where: {
        ...(dependenteId ? { dependente_id: dependenteId } : {}),
        ...(requestIsAdmin(req) ? {} : { dependente: { usuario_id: requestUserId(req) } }),
        status: 'resolvido',
      },
    });

    res.json({
      device,
      recentAlerts,
      lastLocation,
      medications,
      nextMedication,
      alertsSummary: {
        totalToday: alertsTodayCount,
        active: alertsActiveCount,
        resolved: alertsResolvedCount,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/alertas', async (req, res) => {
  try {
    const alertas = await prisma.alertas.findMany({
      where: requestIsAdmin(req) ? undefined : { dependente: { usuario_id: requestUserId(req) } },
      orderBy: { data_hora: 'desc' },
      include: { dependente: true },
    });
    res.json(alertas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/alertas/recorrentes', async (req, res) => {
  try {
    const schedules = await prisma.alertas_recorrentes.findMany({
      where: {
        ativo: true,
        ...(requestIsAdmin(req) ? {} : { dependente: { usuario_id: requestUserId(req) } }),
      },
      include: { dependente: { select: { nome: true } } },
      orderBy: { proximo_disparo: 'asc' },
    });
    res.json(schedules);
  } catch (error) {
    console.error('Erro ao carregar programações de alertas:', error);
    res.status(500).json({ error: 'Não foi possível carregar as programações de alertas.' });
  }
});

app.post('/api/alertas', async (req, res) => {
  try {
    const { dependente_id, tipo, titulo, descricao, prioridade, status, data_hora } = req.body;
    const recurrence = req.body.recorrencia;
    if (recurrence !== undefined) {
      if (!recurrence || typeof recurrence !== 'object' || Array.isArray(recurrence)) {
        return res.status(400).json({ error: 'Dados de recorrência inválidos.' });
      }
      const { dias_semana, data_inicio, horario } = recurrence;
      if (!Array.isArray(dias_semana)
        || dias_semana.length === 0
        || dias_semana.some((day: unknown) => !Number.isInteger(day) || Number(day) < 0 || Number(day) > 6)
        || new Set(dias_semana).size !== dias_semana.length) {
        return res.status(400).json({ error: 'Selecione pelo menos um dia da semana válido.' });
      }
      if (typeof data_inicio !== 'string'
        || !/^\d{4}-\d{2}-\d{2}$/.test(data_inicio)
        || typeof horario !== 'string'
        || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) {
        return res.status(400).json({ error: 'Informe uma data de início e um horário válidos.' });
      }
      const startDate = parseBrasiliaDateTime(data_inicio, '00:00');
      if (!startDate || data_inicio < getBrasiliaDateString(new Date())) {
        return res.status(400).json({ error: 'A data de início da programação não pode estar no passado.' });
      }
      if (dependente_id === undefined || dependente_id === null) {
        return res.status(400).json({ error: 'Selecione um dependente para a programação.' });
      }
      const dependentId = Number(dependente_id);
      if (!Number.isInteger(dependentId) || dependentId <= 0) {
        return res.status(400).json({ error: 'Dependente inválido para a programação.' });
      }
      const dependent = await prisma.dependentes.findFirst({ where: dependentAccessWhere(req, dependentId) });
      if (!dependent) return res.status(404).json({ error: 'Dependente não encontrado' });

      const nextOccurrence = getNextWeeklyOccurrence(dias_semana, horario, new Date(), data_inicio);
      if (!nextOccurrence) {
        return res.status(400).json({ error: 'Não foi possível calcular a próxima ocorrência do alerta.' });
      }
      const schedule = await prisma.alertas_recorrentes.create({
        data: {
          dependente_id: dependentId,
          tipo: tipo || 'medicamento',
          titulo: titulo || 'Alerta',
          descricao: descricao || null,
          prioridade: prioridade || 'media',
          dias_semana: dias_semana.join(','),
          data_inicio: startDate,
          horario,
          proximo_disparo: nextOccurrence,
        },
        include: { dependente: { select: { nome: true } } },
      });
      return res.status(201).json(schedule);
    }

    if (tipo === 'lembrete' && !data_hora) {
      return res.status(400).json({ error: 'Informe a data e hora do lembrete.' });
    }
    const alertDate = data_hora === undefined ? new Date() : new Date(data_hora);
    if (Number.isNaN(alertDate.getTime())) {
      return res.status(400).json({ error: 'Data e hora do alerta inválidas.' });
    }
    if (tipo === 'lembrete' && alertDate.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'A data e hora do lembrete devem ser futuras.' });
    }
    if (dependente_id !== undefined && dependente_id !== null) {
      const dependent = await prisma.dependentes.findFirst({ where: dependentAccessWhere(req, Number(dependente_id)) });
      if (!dependent) return res.status(404).json({ error: 'Dependente não encontrado' });
    }
    const alerta = await prisma.alertas.create({
      data: {
        dependente_id: dependente_id ?? null,
        tipo: tipo || 'medicamento',
        titulo: titulo || 'Alerta',
        descricao: descricao || null,
        prioridade: prioridade || 'media',
        status: status || 'ativo',
        data_hora: alertDate,
      },
    });
    res.status(201).json(alerta);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.delete('/api/alertas/recorrentes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Programação inválida.' });
    const schedule = await prisma.alertas_recorrentes.findFirst({
      where: { id, ...(requestIsAdmin(req) ? {} : { dependente: { usuario_id: requestUserId(req) } }) },
    });
    if (!schedule) return res.status(404).json({ error: 'Programação não encontrada.' });

    await prisma.alertas_recorrentes.update({ where: { id }, data: { ativo: false } });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao cancelar programação de alerta:', error);
    res.status(500).json({ error: 'Não foi possível cancelar a programação.' });
  }
});

app.patch('/api/alertas/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const alert = await prisma.alertas.findFirst({
      where: { id, ...(requestIsAdmin(req) ? {} : { dependente: { usuario_id: requestUserId(req) } }) },
    });
    if (!alert) return res.status(404).json({ error: 'Alerta não encontrado' });

    const alertaAtualizado = await prisma.alertas.update({
      where: { id },
      data: { status },
    });

    res.json(alertaAtualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error ao atualizar o alerta' });
  }
});

app.get('/api/localizacoes', async (req, res) => {
  try {
    const localizacoes = await prisma.localizacoes.findMany({
      where: requestIsAdmin(req) ? undefined : { dependente: { usuario_id: requestUserId(req) } },
      orderBy: [
        { atual: 'desc' },
        { data_hora: 'desc' },
      ],
      include: { dependente: true },
    });
    res.json(localizacoes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/dispositivos', async (req, res) => {
  try {
    const dispositivos = await prisma.dispositivos.findMany({
      where: requestIsAdmin(req) ? undefined : { dependente: { usuario_id: requestUserId(req) } },
      orderBy: { ultima_atualizacao: 'desc' },
      include: { dependente: true },
    });
    res.json(dispositivos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});


// ======== ROTAS DE USUÁRIOS ========

app.get('/api/usuarios', requireAdmin, async (req, res) => {
  try {
    const usuarios = await prisma.usuarios.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        data_nascimento: true,
        data_criacao: true,
        dependentes: true,
        assinaturas: {
          orderBy: [{ data_criacao: 'desc' }, { id: 'desc' }],
          take: 1,
          include: { plano: true },
        },
      },
    });
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/usuarios/current', requireAdmin, async (req, res) => {
  try {
    const usuario = await prisma.usuarios.findFirst({
      include: { dependentes: true },
      orderBy: { id: 'asc' },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/usuarios/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuario = await prisma.usuarios.findUnique({
      where: { id },
      include: { dependentes: true },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const nome = String(req.body?.nome ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const senha = String(req.body?.senha ?? '').trim();
    const telefone = String(req.body?.telefone ?? '').trim();
    const data_nascimento = req.body?.data_nascimento ?? null;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    if (!email.endsWith('@gmail.com')) {
      return res.status(400).json({ error: 'O e-mail deve ser do domínio @gmail.com.' });
    }

    const usuarioExistente = await prisma.usuarios.findUnique({
      where: { email }
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: 'Este e-mail já está cadastrado no sistema.' });
    }

    let birthDate = null;
    if (data_nascimento) {
      const dateObj = new Date(data_nascimento);
      if (!Number.isNaN(dateObj.getTime())) {
        const dateStr = dateObj.toISOString().split('T')[0];
        birthDate = new Date(dateStr + 'T00:00:00.000Z');
      }
    }

    const novoUsuario = await prisma.usuarios.create({
      data: {
        nome,
        email,
        senha: await bcrypt.hash(senha, 12),
        telefone: telefone || null,
        data_nascimento: birthDate,
      },
    });

    res.status(201).json(publicUser(novoUsuario));
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro interno ao salvar no banco de dados' });
  }
});

app.put('/api/usuarios/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, email, senha, telefone, data_nascimento } = req.body;

    const data: Prisma.usuariosUpdateManyMutationInput = {};
    if (nome !== undefined) data.nome = nome;
    if (email !== undefined) data.email = email;
    if (telefone !== undefined) data.telefone = telefone || null;
    if (data_nascimento !== undefined) {
      if (data_nascimento) {
        const dateObj = new Date(data_nascimento);
        if (Number.isNaN(dateObj.getTime())) {
          return res.status(400).json({ error: 'Data de nascimento inválida.' });
        }
        const dateStr = dateObj.toISOString().split('T')[0]; // Extrai YYYY-MM-DD
        data.data_nascimento = new Date(dateStr + 'T00:00:00.000Z');
      } else {
        data.data_nascimento = null;
      }
    }

    if (senha !== undefined) {
      const newPassword = String(senha);
      const recoveryCode = String(req.body?.codigoRecuperacao ?? '').trim();
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 8 caracteres.' });
      }
      if (!recoveryCode) {
        return res.status(400).json({ error: 'Informe o código de recuperação fornecido pelo usuário.' });
      }
      const passwordUpdated = await updatePasswordUsingRecoveryCode(id, recoveryCode, newPassword, data);
      if (!passwordUpdated) {
        return res.status(400).json({ error: 'Código inválido, expirado ou bloqueado após muitas tentativas.' });
      }
      const updatedUser = await prisma.usuarios.findUnique({ where: { id } });
      if (!updatedUser) return res.status(404).json({ error: 'Usuário não encontrado.' });
      return res.json(publicUser(updatedUser));
    }

    const usuarioAtualizado = await prisma.usuarios.update({
      where: { id },
      data,
      include: { dependentes: true },
    });

    res.json(publicUser(usuarioAtualizado));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.delete('/api/usuarios/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await prisma.usuarios.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});


// ======== ROTAS DE AUTENTICAÇÃO / CONFIG ========

app.post('/api/password-recovery/request', async (req, res) => {
  const identifier = String(req.body?.identifier ?? '').trim();
  const method = req.body?.method;
  if (!identifier || (method !== 'email' && method !== 'admin')) {
    return res.status(400).json({ error: 'Informe um identificador e uma forma de recuperação válida.' });
  }
  if (method === 'email' && !identifier.includes('@')) {
    return res.status(400).json({ error: 'Informe o e-mail cadastrado para receber o código.' });
  }

  try {
    const code = String(randomInt(100000, 1000000));
    const usuario = await findRecoveryUser(identifier, method === 'admin');
    if (usuario) {
      const now = new Date();
      if (
        method === 'email'
        &&
        usuario.codigo_recuperacao_enviado_em
        && now.getTime() - usuario.codigo_recuperacao_enviado_em.getTime() < RECOVERY_REQUEST_COOLDOWN_MS
      ) {
        return res.status(202).json({
          message: 'Se houver uma conta com esse e-mail, enviaremos um código. Caso tenha solicitado recentemente, use o código ainda válido ou aguarde um minuto.',
        });
      }

      const codeHash = await hashRecoveryCode(code);
      await prisma.usuarios.update({
        where: { id: usuario.id },
        data: {
          codigo_recuperacao_hash: codeHash,
          codigo_recuperacao_expira: new Date(now.getTime() + RECOVERY_CODE_TTL_MS),
          codigo_recuperacao_enviado_em: now,
          tentativas_recuperacao: 0,
        },
      });

      if (method === 'email') {
        const { host, port, username, password } = systemConfig.emailServer;
        if (!host || !username || !password) {
          await prisma.usuarios.updateMany({
            where: { id: usuario.id, codigo_recuperacao_hash: codeHash },
            data: {
              codigo_recuperacao_hash: null,
              codigo_recuperacao_expira: null,
              codigo_recuperacao_enviado_em: null,
              tentativas_recuperacao: 0,
            },
          });
          return res.status(202).json({
            message: 'Se houver uma conta com esse e-mail, enviaremos um código. Se não receber, use a recuperação assistida pelo administrador.',
          });
        }
        try {
          const smtpPort = Number.parseInt(port, 10) || 587;
          const transporter = nodemailer.createTransport({
            host,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: username, pass: password },
          });
          await transporter.sendMail({
            from: username,
            to: usuario.email,
            subject: 'Código para recuperar sua conta PathFinder',
            text: `Seu código de recuperação é ${code}. Ele expira em 15 minutos e só pode ser usado uma vez.`,
          });
        } catch (error) {
          console.error('Erro ao enviar código de recuperação por e-mail:', error);
          await prisma.usuarios.updateMany({
            where: { id: usuario.id, codigo_recuperacao_hash: codeHash },
            data: {
              codigo_recuperacao_hash: null,
              codigo_recuperacao_expira: null,
              codigo_recuperacao_enviado_em: null,
              tentativas_recuperacao: 0,
            },
          });
          return res.status(202).json({
            message: 'Se houver uma conta com esse e-mail, enviaremos um código. Se não receber, use a recuperação assistida pelo administrador.',
          });
        }
      }
    }

    return res.status(202).json({
      message: method === 'email'
        ? 'Se houver uma conta com esse e-mail, enviaremos um código de recuperação.'
        : 'Se os dados corresponderem a uma conta, o código exibido poderá ser informado ao administrador.',
      ...(method === 'admin' ? { code, adminContact: getAdminCredentials().email } : {}),
    });
  } catch (error) {
    console.error('Erro ao iniciar recuperação de senha:', error);
    return res.status(500).json({ error: 'Não foi possível iniciar a recuperação de senha.' });
  }
});

app.post('/api/password-recovery/reset', async (req, res) => {
  const identifier = String(req.body?.identifier ?? '').trim();
  const code = String(req.body?.code ?? '').trim();
  const password = String(req.body?.senha ?? '');
  if (!identifier || !code || password.length < 8) {
    return res.status(400).json({ error: 'Informe o identificador, o código e uma senha com pelo menos 8 caracteres.' });
  }

  try {
    const usuario = await findRecoveryUser(identifier, false);
    if (!usuario || !await updatePasswordUsingRecoveryCode(usuario.id, code, password)) {
      return res.status(400).json({ error: 'Código inválido, expirado ou bloqueado após muitas tentativas.' });
    }
    return res.json({ message: 'Senha redefinida com sucesso. Você já pode entrar com a nova senha.' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return res.status(500).json({ error: 'Não foi possível redefinir a senha.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const senha = String(req.body?.senha ?? '').trim();

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { email },
    });

    if (!usuario) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    const senhaValida = usuario.senha.startsWith('$2')
      ? await bcrypt.compare(senha, usuario.senha)
      : usuario.senha === senha;

    if (!senhaValida) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    if (!usuario.senha.startsWith('$2')) {
      await prisma.usuarios.update({
        where: { id: usuario.id },
        data: { senha: await bcrypt.hash(senha, 12) },
      });
    }

    const ownInstitutionalSubscription = await prisma.assinaturas.findFirst({
      where: {
        usuario_id: usuario.id,
        status: 'simulada',
        validade_ate: { gt: new Date() },
        plano: { nome: 'Institucional' },
      },
      select: { id: true },
    });
    const doctorMembership = await prisma.institutional_memberships.findFirst({
      where: {
        medico_id: usuario.id,
        ativo: true,
        instituicao: {
          assinaturas: {
            some: {
              status: 'simulada',
              validade_ate: { gt: new Date() },
              plano: { nome: 'Institucional' },
            },
          },
        },
      },
      select: { id: true },
    });

    res.json({
      message: 'Login realizado com sucesso!',
      token: createToken(usuario),
      usuario: publicUser(usuario),
      institutionalAccess: Boolean(ownInstitutionalSubscription || doctorMembership),
    });
  } catch (err) {
    console.error('Erro ao tentar fazer login:', err);
    res.status(500).json({ error: 'Erro interno ao tentar fazer login.' });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const senha = String(req.body?.senha ?? req.body?.password ?? '').trim();
    const { email: adminEmail, password: adminPassword } = getAdminCredentials();
    const defaultAdminEmail = DEFAULT_ADMIN_EMAIL;
    const defaultAdminPassword = DEFAULT_ADMIN_PASSWORD;
    const legacyAdminEmail = LEGACY_ADMIN_EMAIL;
    const legacyAdminPassword = LEGACY_ADMIN_PASSWORD;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const adminUser = adminEmail ? await prisma.usuarios.findUnique({ where: { email: adminEmail } }) : null;
    const legacyAdminUser = legacyAdminEmail ? await prisma.usuarios.findUnique({ where: { email: legacyAdminEmail } }) : null;
    const defaultAdminUser = adminEmail !== defaultAdminEmail
      ? await prisma.usuarios.findUnique({ where: { email: defaultAdminEmail } })
      : null;

    const matchesDefaultCredentials = email === defaultAdminEmail && senha === defaultAdminPassword;
    const matchesLegacyCredentials = email === legacyAdminEmail && senha === legacyAdminPassword;
    const matchesConfiguredCredentials = email === adminEmail && senha === adminPassword;

    const validDefaultAdmin = matchesDefaultCredentials && !(adminUser || legacyAdminUser || defaultAdminUser)
      ? await prisma.usuarios.upsert({
        where: { email: defaultAdminEmail },
        update: { senha: await bcrypt.hash(defaultAdminPassword, 12) },
        create: {
          nome: 'Administrador PathFinder',
          email: defaultAdminEmail,
          senha: await bcrypt.hash(defaultAdminPassword, 12),
          telefone: '(11) 99999-9999',
          data_nascimento: new Date('1990-01-01'),
        },
      })
      : null;

    const adminRecord = adminUser ?? legacyAdminUser ?? defaultAdminUser ?? validDefaultAdmin;
    const senhaValida = adminRecord
      ? (
        adminRecord.senha.startsWith('$2')
          ? await bcrypt.compare(senha, adminRecord.senha)
          : adminRecord.senha === senha
      )
      : false;
    const emailMatchesConfiguredAdmin = email === adminEmail || email === legacyAdminEmail;
    const validAdminLogin = (emailMatchesConfiguredAdmin || matchesDefaultCredentials || matchesLegacyCredentials)
      && (senhaValida || matchesDefaultCredentials || matchesLegacyCredentials || matchesConfiguredCredentials);

    if (!adminRecord || !validAdminLogin) {
      return res.status(401).json({ error: 'Credenciais administrativas inválidas.' });
    }

    return res.json({
      message: 'Acesso administrativo concedido!',
      admin: true,
      token: createToken(adminRecord, true),
      usuario: publicUser(adminRecord),
    });
  } catch (err) {
    console.error('Erro no login admin:', err);
    res.status(500).json({ error: 'Erro interno no servidor de admin.' });
  }
});

app.post('/api/config', requireAdmin, async (req, res) => {
  try {
    const config = req.body;
    
    // Validação básica
    if (!config.emailServer?.host || !config.emailServer?.username) {
      return res.status(400).json({ message: 'Dados de email incompletos' });
    }

    // Atualiza a configuração global
    systemConfig = { ...config };
    
    console.log('✓ Configurações salvas:', {
      emailNotifications: config.emailNotifications,
      backupEnabled: config.backupEnabled,
      maintenanceMode: config.maintenanceMode,
      backupSchedule: config.backupSchedule,
    });

    res.json({ success: true, message: 'Configurações salvas com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao salvar configurações' });
  }
});

// GET /api/config - Retorna configurações atuais
app.get('/api/config', requireAdmin, async (req, res) => {
  try {
    // Retorna a config sem mostrar a senha
    res.json({
      ...systemConfig,
      emailServer: {
        ...systemConfig.emailServer,
        password: systemConfig.emailServer.password ? '••••••••' : '', // Oculta a senha
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao carregar configurações' });
  }
});

// POST /api/config/test-email - Testa conexão de email
app.post('/api/config/test-email', requireAdmin, async (req, res) => {
  try {
    const { host, port, username, password } = req.body;

    if (!host || !username || !password) {
      return res.status(400).json({ message: 'Dados de email incompletos' });
    }

    // Cria um transporter com as credenciais fornecidas
    const transporter = nodemailer.createTransport({
      host: host,
      port: parseInt(port) || 587,
      secure: parseInt(port) === 465, // true para 465, false para outros portos
      auth: {
        user: username,
        pass: password,
      },
    });

    // Tenta verificar a conexão
    await transporter.verify();

    // Se chegou aqui, a conexão funcionou
    res.json({ success: true, message: 'Conexão de email testada com sucesso!' });
  } catch (err: any) {
    console.error('Erro ao testar email:', err.message);
    res.status(400).json({ 
      message: `Erro ao conectar ao servidor de email: ${err.message || 'Credenciais inválidas'}` 
    });
  }
});


// Inicialização do Servidor
const port = process.env.PORT ?? 4000;
async function dispatchRecurringAlerts() {
  try {
    const dueSchedules = await prisma.alertas_recorrentes.findMany({
      where: { ativo: true, proximo_disparo: { lte: new Date() } },
      take: 100,
    });

    for (const schedule of dueSchedules) {
      const days = schedule.dias_semana.split(',').map(Number);
      const nextOccurrence = getNextWeeklyOccurrence(days, schedule.horario, new Date());
      if (!nextOccurrence) {
        console.error(`Não foi possível calcular a próxima ocorrência para a programação ${schedule.id}.`);
        continue;
      }

      await prisma.$transaction(async (transaction) => {
        const claimed = await transaction.alertas_recorrentes.updateMany({
          where: { id: schedule.id, ativo: true, proximo_disparo: schedule.proximo_disparo },
          data: { proximo_disparo: nextOccurrence },
        });
        if (claimed.count !== 1) return;

        await transaction.alertas.create({
          data: {
            dependente_id: schedule.dependente_id,
            tipo: schedule.tipo,
            titulo: schedule.titulo,
            descricao: schedule.descricao,
            prioridade: schedule.prioridade,
            status: 'ativo',
            data_hora: schedule.proximo_disparo,
          },
        });
      });
    }
  } catch (error) {
    console.error('Erro ao processar alertas recorrentes:', error);
  }
}

void dispatchRecurringAlerts();
setInterval(() => { void dispatchRecurringAlerts(); }, 15_000);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});