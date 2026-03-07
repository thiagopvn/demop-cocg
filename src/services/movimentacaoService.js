import { doc, getDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
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
    let estoqueViatura = materialData.estoque_viatura || 0;
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
        if (movimentacao.subtype === 'viatura') {
          // Saída para viatura: reverter estoque_viatura e restaurar estoque_atual
          estoqueAtual += quantity;
          estoqueViatura = Math.max(0, estoqueViatura - quantity);
        } else {
          // Saída consumo: reverter total e atual
          estoqueTotal += quantity;
          estoqueAtual += quantity;
        }
        needsStockUpdate = true;
        break;
      case 'reparo':
        estoqueAtual += quantity;
        needsStockUpdate = true;
        break;
    }

    if (needsStockUpdate) {
      const updateData = {
        estoque_total: estoqueTotal,
        estoque_atual: estoqueAtual,
      };
      if (movimentacao.subtype === 'viatura') {
        updateData.estoque_viatura = estoqueViatura;
      }
      await updateDoc(materialRef, updateData);
    }

    // Se saída para viatura, reverter alocação em viatura_materiais
    if (type === 'saída' && movimentacao.subtype === 'viatura' && movimentacao.viatura) {
      const vmQuery = query(
        collection(db, 'viatura_materiais'),
        where('viatura_id', '==', movimentacao.viatura),
        where('material_id', '==', materialId),
        where('status', '==', 'alocado')
      );
      const vmSnap = await getDocs(vmQuery);
      if (!vmSnap.empty) {
        const vmDoc = vmSnap.docs[0];
        const vmData = vmDoc.data();
        const newQtd = vmData.quantidade - quantity;
        if (newQtd <= 0) {
          await updateDoc(doc(db, 'viatura_materiais', vmDoc.id), {
            status: 'desalocado',
            data_desalocacao: serverTimestamp(),
            motivo_desalocacao: 'Movimentação excluída',
          });
        } else {
          await updateDoc(doc(db, 'viatura_materiais', vmDoc.id), {
            quantidade: newQtd,
            ultima_atualizacao: serverTimestamp(),
          });
        }
      }
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
}

/**
 * Transfere o tipo de uma movimentação (somente admingeral).
 *
 * Cautela → Saída (Consumo):
 *   - estoque_total -= quantity (material sai definitivamente)
 *   - estoque_atual já foi decrementado na cautela original
 *
 * Cautela → Saída (Viatura):
 *   - estoque_viatura += quantity (material vai para viatura)
 *   - estoque_atual já foi decrementado na cautela original
 *   - Cria registro em viatura_materiais
 *
 * Cautela → Reparo:
 *   - Sem mudança de estoque (estoque_atual já decrementado)
 *   - Muda tipo e status
 */
export async function transferMovimentacao({
  movimentacao,
  newType,
  subtype,
  viatura,
  responsavel,
  observacoes,
  repairData,
  transferidoPor,
  transferidoPorNome,
}) {
  const movId = movimentacao.id;
  const materialId = movimentacao.material;
  const quantity = parseInt(movimentacao.quantity) || 0;
  const movRef = doc(db, 'movimentacoes', movId);
  const materialRef = doc(db, 'materials', materialId);
  const materialSnap = await getDoc(materialRef);

  if (!materialSnap.exists()) {
    throw new Error('Material não encontrado no sistema.');
  }

  const materialData = materialSnap.data();
  const updateMovData = {
    original_type: movimentacao.type,
    original_status: movimentacao.status,
    transferred_at: serverTimestamp(),
    transferred_by: transferidoPor,
    transferred_by_name: transferidoPorNome,
  };

  const materialUpdateData = {};

  if (newType === 'saída') {
    updateMovData.type = 'saída';
    updateMovData.status = 'descartado';
    updateMovData.subtype = subtype;
    if (observacoes) updateMovData.observacoes_transferencia = observacoes;

    if (responsavel) {
      updateMovData.user = responsavel.id;
      updateMovData.user_name = responsavel.full_name;
      updateMovData.user_rg = responsavel.rg || null;
      updateMovData.telefone_responsavel = responsavel.telefone || null;
    }

    if (subtype === 'consumo') {
      // Saída consumo: material sai do total
      materialUpdateData.estoque_total = (materialData.estoque_total || 0) - quantity;
      updateMovData.signed = false;

    } else if (subtype === 'viatura' && viatura) {
      // Saída para viatura: material vai para estoque_viatura
      materialUpdateData.estoque_viatura = (materialData.estoque_viatura || 0) + quantity;
      updateMovData.viatura = viatura.id;
      updateMovData.viatura_description = viatura.prefixo
        ? `${viatura.prefixo} - ${viatura.description}`
        : viatura.description;
      updateMovData.signed = false;

      // Criar ou atualizar alocação na viatura_materiais
      const vmQuery = query(
        collection(db, 'viatura_materiais'),
        where('viatura_id', '==', viatura.id),
        where('material_id', '==', materialId),
        where('status', '==', 'alocado')
      );
      const vmSnap = await getDocs(vmQuery);

      if (!vmSnap.empty) {
        const existingDoc = vmSnap.docs[0];
        const existingData = existingDoc.data();
        await updateDoc(doc(db, 'viatura_materiais', existingDoc.id), {
          quantidade: existingData.quantidade + quantity,
          ultima_atualizacao: serverTimestamp(),
          atualizado_por: transferidoPor,
          atualizado_por_nome: transferidoPorNome,
        });
      } else {
        await addDoc(collection(db, 'viatura_materiais'), {
          viatura_id: viatura.id,
          viatura_prefixo: viatura.prefixo || '',
          viatura_description: viatura.description,
          material_id: materialId,
          material_description: materialData.description || movimentacao.material_description,
          categoria: materialData.categoria || movimentacao.categoria || '',
          quantidade: quantity,
          data_alocacao: serverTimestamp(),
          alocado_por: transferidoPor,
          alocado_por_nome: transferidoPorNome,
          status: 'alocado',
          origem: 'transferencia',
          movimentacao_id: movId,
        });
      }

      // Atualizar última movimentação da viatura
      const viaturaRef = doc(db, 'viaturas', viatura.id);
      await updateDoc(viaturaRef, { ultima_movimentacao: serverTimestamp() });
    }

  } else if (newType === 'reparo') {
    updateMovData.type = 'reparo';
    updateMovData.status = 'emReparo';
    if (repairData?.repairLocation) updateMovData.repairLocation = repairData.repairLocation;
    if (repairData?.seiNumber) updateMovData.seiNumber = repairData.seiNumber;
    if (repairData?.motivoReparo) updateMovData.motivoReparo = repairData.motivoReparo;
    if (observacoes) updateMovData.observacoes_transferencia = observacoes;
  }

  // Atualizar material
  if (Object.keys(materialUpdateData).length > 0) {
    materialUpdateData.ultima_movimentacao = serverTimestamp();
    await updateDoc(materialRef, materialUpdateData);
  }

  // Atualizar movimentação
  await updateDoc(movRef, updateMovData);
}
