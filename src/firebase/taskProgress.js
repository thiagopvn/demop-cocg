import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import db from './db';
import { logAudit } from './auditLog';

/**
 * Incrementa o progresso de tarefas ativas do tipo conferencia/contagem.
 * Chamado apos cada material_update (conferencia de material).
 * Quando a meta e atingida, a tarefa e auto-concluida e o admingeral e notificado via audit_log.
 */
export async function incrementTaskProgress(userId, userName) {
    try {
        const q = query(
            collection(db, 'tarefas_demop'),
            where('status', '==', 'ativa')
        );
        const snapshot = await getDocs(q);

        for (const taskDoc of snapshot.docs) {
            const data = taskDoc.data();
            if (data.type === 'conferencia' || data.type === 'contagem') {
                const newProgress = (data.progress || 0) + 1;
                const updates = { progress: newProgress };

                if (data.targetCount && newProgress >= data.targetCount) {
                    updates.status = 'concluida';
                    updates.completedAt = serverTimestamp();
                    updates.completedBy = userId || null;
                    updates.completedByName = userName || 'Auto (meta atingida)';

                    // Notificar admingeral via audit_log
                    logAudit({
                        action: 'tarefa_complete',
                        userId: userId || 'sistema',
                        userName: userName || 'Sistema',
                        targetCollection: 'tarefas_demop',
                        targetId: taskDoc.id,
                        targetName: data.title,
                        details: {
                            tipo: data.type,
                            meta: data.targetCount,
                            progresso: newProgress,
                            concluida_automaticamente: true,
                        },
                    });
                }

                await updateDoc(doc(db, 'tarefas_demop', taskDoc.id), updates);
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar progresso da tarefa:', error);
    }
}
