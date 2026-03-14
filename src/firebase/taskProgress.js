import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import db from './db';
import { logAudit } from './auditLog';

/**
 * Reconcilia o progresso de tarefas ativas do tipo conferencia/contagem
 * contando os registros de audit_log (material_create + material_update) desde a criacao da tarefa.
 * Chamado ao carregar a tela de Atividades para corrigir progressos desatualizados.
 */
export async function reconcileTaskProgress() {
    try {
        const taskQuery = query(
            collection(db, 'tarefas_demop'),
            where('status', '==', 'ativa')
        );
        const taskSnapshot = await getDocs(taskQuery);

        for (const taskDoc of taskSnapshot.docs) {
            const taskData = taskDoc.data();
            if (taskData.type !== 'conferencia' && taskData.type !== 'contagem') continue;
            if (!taskData.createdAt || !taskData.targetCount) continue;

            const taskCreatedAt = taskData.createdAt.toMillis();

            // Buscar audit entries de material_create e material_update
            const [createSnap, updateSnap] = await Promise.all([
                getDocs(query(collection(db, 'audit_logs'), where('action', '==', 'material_create'))),
                getDocs(query(collection(db, 'audit_logs'), where('action', '==', 'material_update'))),
            ]);

            // Filtrar apenas os que ocorreram depois da criacao da tarefa
            const countAfter = (snap) => snap.docs.filter(d => {
                const ts = d.data().timestamp;
                return ts && ts.toMillis() >= taskCreatedAt;
            }).length;

            const totalCount = countAfter(createSnap) + countAfter(updateSnap);

            if (totalCount !== (taskData.progress || 0)) {
                const updates = { progress: totalCount };

                if (totalCount >= taskData.targetCount) {
                    updates.status = 'concluida';
                    updates.completedAt = serverTimestamp();
                    updates.completedByName = 'Auto (meta atingida)';

                    logAudit({
                        action: 'tarefa_complete',
                        userId: 'sistema',
                        userName: 'Sistema',
                        targetCollection: 'tarefas_demop',
                        targetId: taskDoc.id,
                        targetName: taskData.title,
                        details: {
                            tipo: taskData.type,
                            meta: taskData.targetCount,
                            progresso: totalCount,
                            concluida_automaticamente: true,
                            reconciliado: true,
                        },
                    });
                }

                await updateDoc(doc(db, 'tarefas_demop', taskDoc.id), updates);
            }
        }
    } catch (error) {
        console.error('Erro ao reconciliar progresso de tarefas:', error);
    }
}

/**
 * Incrementa o progresso de tarefas ativas do tipo conferencia/contagem.
 * Chamado apos cada material_create ou material_update (conferencia de material).
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
