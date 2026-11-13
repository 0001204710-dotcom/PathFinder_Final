"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prismaClient_1 = __importDefault(require("./prismaClient"));
const router = (0, express_1.Router)();
// Variável global na memória do servidor para controlar a fila do SOS Web
let dispararBuzzerWeb = false;
// --- ROTA DO BOTÃO: Recebe o clique do botão SOS do Dashboard.tsx ---
router.post('/disparar-sos', (req, res) => {
    dispararBuzzerWeb = true;
    return res.status(200).json({ success: true, msg: 'Sinal de SOS Web enfileirado!' });
});
// --- ALTERADO: Agora esta rota responde se deve ou não apitar ---
router.post('/dados', async (req, res) => {
    try {
        const { distancia, bateria, latitude, longitude, queda, sos, estado } = req.body;
        if (distancia === undefined || bateria === undefined || !estado) {
            return res.status(400).json({ erro: 'Campos obrigatorios: distancia, bateria, estado' });
        }
        const result = await prismaClient_1.default.$queryRaw `
      INSERT INTO leitura_arduino (distancia, bateria, latitude, longitude, queda, sos, estado, alerta_enviado, timestamp)
      VALUES (${Number(distancia)}, ${Number(bateria)}, ${latitude ? Number(latitude) : null}, ${longitude ? Number(longitude) : null}, ${queda ? 1 : 0}, ${sos ? 1 : 0}, ${String(estado)}, 0, NOW())
    `;
        // Armazena o estado atual do clique antes de resetar a variável global
        const statusBuzzerAtual = dispararBuzzerWeb;
        // Reseta imediatamente para false para o alarme não entrar em loop infinito
        dispararBuzzerWeb = false;
        // Retorna o status de salvo + a flag que o Python lerá a cada loop de envio
        return res.status(201).json({
            status: 'salvo',
            id: Number(result.insertId),
            disparar_web: statusBuzzerAtual
        });
    }
    catch (error) {
        console.error('Erro ao salvar leitura:', error);
        return res.status(500).json({ erro: 'Erro interno do servidor' });
    }
});
router.get('/leituras', async (_req, res) => {
    try {
        const leituras = await prismaClient_1.default.$queryRaw `
      SELECT * FROM leitura_arduino ORDER BY timestamp DESC LIMIT 50
    `;
        return res.json(leituras);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao buscar leituras' });
    }
});
router.get('/alertas', async (_req, res) => {
    try {
        const alertas = await prismaClient_1.default.$queryRaw `
      SELECT * FROM leitura_arduino WHERE sos = 1 OR queda = 1 ORDER BY timestamp DESC LIMIT 100
    `;
        return res.json(alertas);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao buscar alertas' });
    }
});
router.get('/ultima', async (_req, res) => {
    try {
        const rows = await prismaClient_1.default.$queryRaw `
      SELECT * FROM leitura_arduino ORDER BY timestamp DESC LIMIT 1
    `;
        if (!rows || rows.length === 0)
            return res.status(404).json({ erro: 'Nenhuma leitura encontrada' });
        return res.json(rows[0]);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ erro: 'Erro ao buscar ultima leitura' });
    }
});
exports.default = router;
