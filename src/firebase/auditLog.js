import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, Timestamp, writeBatch, doc } from 'firebase/firestore';
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
};

/**
 * Migra dados historicos das collections existentes para audit_logs.
 * Puxa retroativamente: movimentacoes, devolucoes, alocacoes em viaturas,
 * conferencias de materiais.
 * @param {function} onProgress - Callback de progresso (etapa, total, mensagem)
 * @returns {Promise<{total: number, errors: number}>}
 */
export async function migrateHistoricalAuditLogs(onProgress = () => {}) {
    let total = 0;
    let errors = 0;
    const BATCH_SIZE = 400; // Firestore limit is 500 per batch

    // Helper: commit batch entries
    const commitEntries = async (entries) => {
        // Split into chunks of BATCH_SIZE
        for (let i = 0; i < entries.length; i += BATCH_SIZE) {
            const chunk = entries.slice(i, i + BATCH_SIZE);
            const batch = writeBatch(db);
            for (const entry of chunk) {
                const ref = doc(auditLogsCollection);
                batch.set(ref, entry);
            }
            await batch.commit();
            total += chunk.length;
        }
    };

    // Helper: extract timestamp from Firestore field
    const getTimestamp = (field) => {
        if (!field) return null;
        if (field.toDate) return field; // already a Firestore Timestamp
        if (field instanceof Date) return Timestamp.fromDate(field);
        if (typeof field === 'string') return Timestamp.fromDate(new Date(field));
        return null;
    };

    try {
        // === 1. MOVIMENTACOES ===
        onProgress('movimentacoes', 0, 'Carregando movimentacoes...');
        const movSnap = await getDocs(query(collection(db, 'movimentacoes'), orderBy('date', 'desc')));
        const movEntries = [];
        const devEntries = [];

        movSnap.docs.forEach(d => {
            const data = d.data();
            if (!data.sender_name && !data.sender) return; // skip if no user info

            const ts = getTimestamp(data.date);
            if (!ts) return;

            // Movimentacao
            movEntries.push({
                action: 'movimentacao_create',
                userId: data.sender || null,
                userName: data.sender_name || 'Desconhecido',
                targetCollection: 'movimentacoes',
                targetId: d.id,
                targetName: data.material_description || null,
                details: {
                    tipo: data.type || null,
                    quantidade: data.quantity || null,
                    militar: data.user_name || null,
                    viatura: data.viatura_description || null,
                },
                timestamp: ts,
                _migrated: true,
            });

            // Devolucao
            if ((data.status === 'devolvido' || data.status === 'devolvidaDeReparo') && data.returned_date) {
                const retTs = getTimestamp(data.returned_date);
                if (retTs) {
                    devEntries.push({
                        action: 'devolucao_create',
                        userId: data.sender || null,
                        userName: data.sender_name || 'Desconhecido',
                        targetCollection: 'movimentacoes',
                        targetId: d.id,
                        targetName: data.material_description || null,
                        details: {
                            quantidade: data.quantity || null,
                            militar: data.user_name || null,
                        },
                        timestamp: retTs,
                        _migrated: true,
                    });
                }
            }
        });

        onProgress('movimentacoes', movEntries.length, `Salvando ${movEntries.length} movimentacoes...`);
        await commitEntries(movEntries);
        onProgress('devolucoes', devEntries.length, `Salvando ${devEntries.length} devolucoes...`);
        await commitEntries(devEntries);

        // === 2. ALOCACOES EM VIATURAS ===
        onProgress('alocacoes', 0, 'Carregando alocacoes em viaturas...');
        const vmSnap = await getDocs(collection(db, 'viatura_materiais'));
        const vmEntries = [];

        vmSnap.docs.forEach(d => {
            const data = d.data();
            if (!data.alocado_por_nome && !data.alocado_por) return;

            const ts = getTimestamp(data.data_alocacao);
            if (!ts) return;

            vmEntries.push({
                action: 'material_allocate',
                userId: data.alocado_por || null,
                userName: data.alocado_por_nome || 'Desconhecido',
                targetCollection: 'viatura_materiais',
                targetId: d.id,
                targetName: data.material_description || null,
                details: {
                    viatura: data.viatura_prefixo ? `${data.viatura_prefixo} - ${data.viatura_description}` : data.viatura_description || null,
                    quantidade: data.quantidade || null,
                },
                timestamp: ts,
                _migrated: true,
            });
        });

        onProgress('alocacoes', vmEntries.length, `Salvando ${vmEntries.length} alocacoes...`);
        await commitEntries(vmEntries);

        // === 3. CONFERENCIAS DE MATERIAIS ===
        onProgress('conferencias', 0, 'Carregando conferencias de materiais...');
        const matSnap = await getDocs(collection(db, 'materials'));
        const matEntries = [];

        matSnap.docs.forEach(d => {
            const data = d.data();
            if (!data.conferido_por) return;

            const ts = getTimestamp(data.ultima_conferencia) || getTimestamp(data.ultima_movimentacao);
            if (!ts) return;

            matEntries.push({
                action: 'material_update',
                userId: null, // conferido_por armazena apenas o nome
                userName: data.conferido_por,
                targetCollection: 'materials',
                targetId: d.id,
                targetName: data.description || null,
                details: {
                    categoria: data.categoria || null,
                    estoque_total: data.estoque_total || null,
                    estoque_atual: data.estoque_atual ?? null,
                },
                timestamp: ts,
                _migrated: true,
            });
        });

        onProgress('conferencias', matEntries.length, `Salvando ${matEntries.length} conferencias...`);
        await commitEntries(matEntries);

        onProgress('concluido', total, `Migracao concluida: ${total} registros criados.`);
        return { total, errors };
    } catch (error) {
        console.error('Erro na migracao de audit logs:', error);
        throw error;
    }
}

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
};
