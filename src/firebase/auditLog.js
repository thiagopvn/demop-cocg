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
export async function logAudit({ action, userId, userName, targetCollection, targetId, targetName, details }) {
    try {
        await addDoc(auditLogsCollection, {
            action,
            userId,
            userName,
            targetCollection,
            targetId: targetId || null,
            targetName: targetName || null,
            details: details || null,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error('Erro ao registrar log de auditoria:', error);
    }
}

// Labels legíveis para cada tipo de ação
export const ACTION_LABELS = {
    material_create: 'Criou material',
    material_update: 'Editou/Conferiu material',
    material_delete: 'Excluiu material',
    material_allocate: 'Alocou material em viatura',
    movimentacao_create: 'Registrou movimentação',
    devolucao_create: 'Registrou devolução',
    user_create: 'Criou usuário',
    user_update: 'Editou usuário',
    user_delete: 'Excluiu usuário',
    user_password_reset: 'Resetou senha de usuário',
    user_deactivate: 'Desativou usuário',
    user_activate: 'Ativou usuário',
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
};

// Cores para cada tipo de ação
export const ACTION_COLORS = {
    material_create: '#4caf50',
    material_update: '#2196f3',
    material_delete: '#f44336',
    material_allocate: '#00bcd4',
    movimentacao_create: '#ff9800',
    devolucao_create: '#8bc34a',
    user_create: '#4caf50',
    user_update: '#2196f3',
    user_delete: '#f44336',
    user_password_reset: '#ff9800',
    user_deactivate: '#9e9e9e',
    user_activate: '#4caf50',
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
};
