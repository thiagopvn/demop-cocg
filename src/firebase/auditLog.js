import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import db from './db';

const auditLogsCollection = collection(db, 'audit_logs');

/**
 * Registra uma acao no log de auditoria.
 * @param {Object} params
 * @param {string} params.action - Tipo da acao (ex: 'material_create', 'material_update', 'material_delete', 'material_allocate', 'movimentacao_create', 'user_create', 'user_delete', 'user_password_reset', 'viatura_create', 'viatura_update', 'viatura_delete', 'manutencao_create', 'devolucao_create')
 * @param {string} params.userId - ID do usuario que realizou a acao
 * @param {string} params.userName - Nome do usuario que realizou a acao
 * @param {string} params.targetCollection - Colecao afetada (ex: 'materials', 'movimentacoes', 'users')
 * @param {string} [params.targetId] - ID do documento afetado
 * @param {string} [params.targetName] - Nome/descricao do item afetado
 * @param {Object} [params.details] - Detalhes adicionais da acao
 */
// Remove valores `undefined` recursivamente — Firestore rejeita undefined em qualquer nível.
function sanitizeForFirestore(value) {
    if (value === undefined) return null;
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) {
        return value
            .map(sanitizeForFirestore)
            .filter((v) => v !== undefined);
    }
    const out = {};
    for (const k of Object.keys(value)) {
        const sanitized = sanitizeForFirestore(value[k]);
        if (sanitized !== undefined) out[k] = sanitized;
    }
    return out;
}

export async function logAudit({ action, userId, userName, targetCollection, targetId, targetName, details }) {
    try {
        await addDoc(auditLogsCollection, {
            action,
            userId,
            userName,
            targetCollection,
            targetId: targetId || null,
            targetName: targetName || null,
            details: details ? sanitizeForFirestore(details) : null,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error('Erro ao registrar log de auditoria:', error);
    }
}

// Labels legíveis para cada tipo de ação
export const ACTION_LABELS = {
    orcamento_nota_create: 'Lançou nota fiscal (Orçamento GOCG)',
    orcamento_nota_update: 'Editou nota fiscal (Orçamento GOCG)',
    orcamento_nota_delete: 'Excluiu nota fiscal (Orçamento GOCG)',
    orcamento_nota_pagamento: 'Alterou situação de pagamento da nota (Orçamento GOCG)',
    orcamento_caixa_create: 'Lançou movimento de caixa (Orçamento GOCG)',
    orcamento_caixa_update: 'Editou movimento de caixa (Orçamento GOCG)',
    orcamento_caixa_delete: 'Excluiu movimento de caixa (Orçamento GOCG)',
    orcamento_setor_create: 'Criou setor de destino (Orçamento GOCG)',
    orcamento_setor_update: 'Renomeou setor de destino (Orçamento GOCG)',
    orcamento_setor_delete: 'Excluiu setor de destino (Orçamento GOCG)',
    material_create: 'Criou material',
    material_update: 'Editou/Conferiu material',
    material_delete: 'Excluiu material',
    material_allocate: 'Alocou material em viatura',
    viatura_material_update: 'Alterou quantidade em viatura',
    viatura_material_remove: 'Desalocou material de viatura',
    reparo_devolucao: 'Registrou retorno de reparo',
    material_local_set: 'Definiu local de guarda do material',
    material_local_move: 'Moveu material entre locais',
    local_create: 'Criou local de armazenamento',
    local_update: 'Editou local de armazenamento',
    local_delete: 'Excluiu local de armazenamento',
    movimentacao_create: 'Registrou movimentação',
    devolucao_create: 'Registrou devolução',
    user_create: 'Criou usuário',
    user_update: 'Editou usuário',
    user_delete: 'Excluiu usuário',
    user_password_reset: 'Resetou senha de usuário',
    user_deactivate: 'Desativou usuário',
    user_activate: 'Ativou usuário',
    perfil_update: 'Editou o próprio perfil',
    perfil_foto_update: 'Trocou a própria foto',
    perfil_foto_remove: 'Removeu a própria foto',
    perfil_senha_change: 'Alterou a própria senha',
    mensagem_aviso: 'Enviou aviso para todos',
    movimentacao_cobranca: 'Cobrou pelo chat',
    amizade_solicitada: 'Pediu amizade',
    amizade_aceita: 'Aceitou amizade',
    cautela_transferencia_solicitada: 'Pediu transferência de cautela',
    cautela_transferida: 'Recebeu cautela por transferência',
    cautela_transferencia_recusada: 'Recusou transferência de cautela',
    viatura_create: 'Criou viatura',
    viatura_update: 'Editou viatura',
    viatura_delete: 'Excluiu viatura',
    manutencao_create: 'Agendou manutenção',
    manutencao_complete: 'Concluiu manutenção',
    categoria_create: 'Criou categoria',
    categoria_update: 'Editou categoria',
    categoria_delete: 'Excluiu categoria',
    ring_create: 'Criou anel',
    ring_update: 'Editou anel',
    ring_delete: 'Excluiu anel',
    tarefa_create: 'Criou missao do dia',
    tarefa_complete: 'Concluiu missao do dia',
    tarefa_cancel: 'Cancelou missao do dia',
    bem_create: 'Cadastrou bem patrimonial',
    bem_update: 'Editou bem patrimonial',
    bem_delete: 'Excluiu bem patrimonial',
    bem_conferir: 'Conferiu bem patrimonial',
    bem_localidade: 'Atualizou localidade de bem',
    bem_observacao: 'Atualizou observação de bem',
    bem_viatura_create: 'Cadastrou viatura (bens)',
    bem_viatura_update: 'Editou viatura (bens)',
    bem_viatura_delete: 'Excluiu viatura (bens)',
};

// Cores para cada tipo de ação
export const ACTION_COLORS = {
    material_create: '#4caf50',
    material_update: '#2196f3',
    material_delete: '#f44336',
    material_allocate: '#00bcd4',
    viatura_material_update: '#0097a7',
    viatura_material_remove: '#ff7043',
    reparo_devolucao: '#8bc34a',
    material_local_set: '#0d9488',
    material_local_move: '#0d9488',
    local_create: '#4caf50',
    local_update: '#2196f3',
    local_delete: '#f44336',
    movimentacao_create: '#ff9800',
    devolucao_create: '#8bc34a',
    user_create: '#4caf50',
    user_update: '#2196f3',
    user_delete: '#f44336',
    user_password_reset: '#ff9800',
    user_deactivate: '#9e9e9e',
    user_activate: '#4caf50',
    perfil_update: '#7c3aed',
    perfil_foto_update: '#7c3aed',
    perfil_foto_remove: '#9333ea',
    perfil_senha_change: '#6d28d9',
    mensagem_aviso: '#0284c7',
    movimentacao_cobranca: '#ea580c',
    amizade_solicitada: '#0891b2',
    amizade_aceita: '#0891b2',
    cautela_transferencia_solicitada: '#d97706',
    cautela_transferida: '#16a34a',
    cautela_transferencia_recusada: '#dc2626',
    viatura_create: '#4caf50',
    viatura_update: '#2196f3',
    viatura_delete: '#f44336',
    manutencao_create: '#9c27b0',
    manutencao_complete: '#4caf50',
    categoria_create: '#4caf50',
    categoria_update: '#2196f3',
    categoria_delete: '#f44336',
    ring_create: '#4caf50',
    ring_update: '#2196f3',
    ring_delete: '#f44336',
    tarefa_create: '#ff6b35',
    tarefa_complete: '#4caf50',
    tarefa_cancel: '#f44336',
    bem_create: '#4caf50',
    bem_update: '#2196f3',
    bem_delete: '#f44336',
    bem_conferir: '#1e3a5f',
    bem_localidade: '#ff6b35',
    bem_observacao: '#f9a825',
    bem_viatura_create: '#4caf50',
    bem_viatura_update: '#2196f3',
    bem_viatura_delete: '#f44336',
};
