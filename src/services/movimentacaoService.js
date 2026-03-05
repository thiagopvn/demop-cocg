import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import db, { storage } from '../firebase/db';

/**
 * Deleta uma movimentação e reverte o impacto no estoque do material.
 *
 * Regras de reversão:
 * - cautela (status cautelado): estoque_atual += quantity
 * - entrada (status emEstoque): estoque_total -= quantity, estoque_atual -= quantity
 * - saída (status descartado): estoque_total += quantity, estoque_atual += quantity
 * - reparo (status emReparo): estoque_atual += quantity
 *
 * Se status = devolvido ou devolvidaDeReparo: estoque já restaurado, só deleta.
 */
export async function deleteMovimentacao(movimentacao) {
  const movId = movimentacao.id;
  const materialId = movimentacao.material;
  const quantity = parseInt(movimentacao.quantity) || 0;
  const status = movimentacao.status;
  const type = movimentacao.type;

  // Buscar material atual (se existir, reverte estoque)
  const materialRef = doc(db, 'materials', materialId);
  const materialSnap = materialId ? await getDoc(materialRef) : null;

  if (materialSnap?.exists() && status !== 'devolvido' && status !== 'devolvidaDeReparo') {
    const materialData = materialSnap.data();
    let estoqueTotal = materialData.estoque_total;
    let estoqueAtual = materialData.estoque_atual;
    let needsStockUpdate = false;

    switch (type) {
      case 'cautela':
        estoqueAtual += quantity;
        needsStockUpdate = true;
        break;
      case 'entrada':
        estoqueTotal -= quantity;
        estoqueAtual -= quantity;
        needsStockUpdate = true;
        break;
      case 'saída':
        estoqueTotal += quantity;
        estoqueAtual += quantity;
        needsStockUpdate = true;
        break;
      case 'reparo':
        estoqueAtual += quantity;
        needsStockUpdate = true;
        break;
    }

    if (needsStockUpdate) {
      await updateDoc(materialRef, {
        estoque_total: estoqueTotal,
        estoque_atual: estoqueAtual,
      });
    }
  }

  // Deletar anexos do Storage (se houver)
  if (movimentacao.anexos?.length > 0) {
    const deletePromises = movimentacao.anexos.map(async (anexo) => {
      try {
        const storageRef = ref(storage, anexo.storagePath);
        await deleteObject(storageRef);
      } catch (err) {
        console.warn('Erro ao deletar anexo do Storage:', err);
      }
    });
    await Promise.all(deletePromises);
  }

  // Deletar a movimentação
  const movRef = doc(db, 'movimentacoes', movId);
  await deleteDoc(movRef);

  return { estoqueTotal, estoqueAtual };
}
