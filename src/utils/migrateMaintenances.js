import { collection, getDocs, deleteDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import db from '../firebase/db';

/**
 * Mapeia intervalo em dias para o tipo de recorrência correspondente.
 */
const intervalToType = (days) => {
    switch (days) {
        case 90: return 'cada_90_dias';
        case 120: return 'cada_120_dias';
        case 180: return 'cada_180_dias';
        case 365: return 'cada_365_dias';
        default: return 'customizado';
    }
};

/**
 * Converte data no formato DD/MM/YYYY para Date.
 */
const parseDateBR = (dateStr) => {
    if (!dateStr) return null;
    const [day, month, year] = dateStr.trim().split('/').map(Number);
    return new Date(year, month - 1, day, 9, 0, 0, 0);
};

/**
 * Faz o parse do CSV do cronograma rebalanceado.
 * Retorna array de objetos com os campos necessários.
 */
export function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    // Primeira linha é o header (pular)
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSV com vírgulas - fazer split respeitando campos
        const parts = line.split(',');
        if (parts.length < 10) continue;

        const n = parseInt(parts[0]);
        const material = parts[1]?.trim();
        const description = parts[2]?.trim();
        const originalType = parts[3]?.trim();
        const originalDate = parts[4]?.trim();
        const priority = parts[5]?.trim();
        const newPeriodicity = parts[6]?.trim();
        const intervalDays = parseInt(parts[7]);
        const newStartDate = parts[8]?.trim();
        const delay = parseInt(parts[9]);

        if (!material || !description || !intervalDays || !newStartDate) continue;

        rows.push({
            n,
            material,
            description,
            originalType,
            originalDate,
            priority: priority || 'media',
            newPeriodicity,
            intervalDays,
            newStartDate,
            delay
        });
    }

    return rows;
}

/**
 * Busca todos os materiais do Firestore e cria um mapa de descrição → material.
 */
async function buildMaterialMap() {
    const snapshot = await getDocs(collection(db, 'materials'));
    const materials = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Criar mapa por descrição (normalizada)
    const map = new Map();
    for (const mat of materials) {
        const key = (mat.description || '').trim().toUpperCase();
        if (key) {
            map.set(key, mat);
        }
    }
    return map;
}

/**
 * Deleta todas as manutenções pendentes/em_andamento da collection manutencoes.
 * Retorna o número de documentos deletados.
 */
async function deleteAllMaintenances(onProgress) {
    const snapshot = await getDocs(collection(db, 'manutencoes'));
    const total = snapshot.size;
    let deleted = 0;

    for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, 'manutencoes', docSnap.id));
        deleted++;
        if (onProgress && deleted % 50 === 0) {
            onProgress({ phase: 'deleting', current: deleted, total });
        }
    }

    if (onProgress) {
        onProgress({ phase: 'deleting', current: deleted, total });
    }

    return deleted;
}

/**
 * Executa a migração completa:
 * 1. Parseia o CSV
 * 2. Busca materiais do Firestore para mapear IDs
 * 3. Deleta todas as manutenções existentes
 * 4. Cria as novas manutenções baseado no cronograma rebalanceado
 *
 * @param {string} csvText - Conteúdo do CSV
 * @param {Function} onProgress - Callback de progresso
 * @returns {Object} Resultado da migração
 */
export async function migrateMaintenances(csvText, onProgress = null) {
    const result = {
        parsed: 0,
        deleted: 0,
        created: 0,
        errors: 0,
        notFound: [],
        errorDetails: []
    };

    try {
        // 1. Parse CSV
        if (onProgress) onProgress({ phase: 'parsing', message: 'Lendo cronograma...' });
        const rows = parseCSV(csvText);
        result.parsed = rows.length;

        if (rows.length === 0) {
            throw new Error('Nenhum registro encontrado no CSV');
        }

        if (onProgress) onProgress({ phase: 'parsing', message: `${rows.length} registros encontrados` });

        // 2. Buscar materiais
        if (onProgress) onProgress({ phase: 'loading_materials', message: 'Carregando materiais...' });
        const materialMap = await buildMaterialMap();

        // 3. Deletar manutenções existentes
        if (onProgress) onProgress({ phase: 'deleting', message: 'Removendo manutenções antigas...' });
        result.deleted = await deleteAllMaintenances(onProgress);

        // 4. Criar novas manutenções
        if (onProgress) onProgress({ phase: 'creating', message: 'Criando novas manutenções...', current: 0, total: rows.length });

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            try {
                // Buscar material pelo nome
                const materialKey = row.material.trim().toUpperCase();
                const material = materialMap.get(materialKey);

                const recurrenceType = intervalToType(row.intervalDays);
                const dueDate = parseDateBR(row.newStartDate);

                if (!dueDate) {
                    result.errors++;
                    result.errorDetails.push(`Linha ${row.n}: Data inválida "${row.newStartDate}"`);
                    continue;
                }

                const maintenanceDoc = {
                    materialId: material?.id || '',
                    materialDescription: row.material,
                    materialCategory: material?.categoria || 'N/A',
                    type: recurrenceType,
                    dueDate: Timestamp.fromDate(dueDate),
                    description: row.description,
                    priority: row.priority || 'media',
                    estimatedDuration: 1,
                    requiredParts: [],
                    status: 'pendente',
                    createdAt: Timestamp.now(),
                    createdBy: 'Sistema - Migração Cronograma Rebalanceado',
                    isRecurrent: true,
                    recurrenceType: recurrenceType,
                    customRecurrenceDays: recurrenceType === 'customizado' ? row.intervalDays : null,
                    recurrenceEndDate: null,
                    recurrenceCount: 0,
                    reminderDays: 3,
                    cronogramaOriginalN: row.n,
                    intervaloDias: row.intervalDays
                };

                await addDoc(collection(db, 'manutencoes'), maintenanceDoc);
                result.created++;

                if (!material) {
                    result.notFound.push(row.material);
                }
            } catch (error) {
                result.errors++;
                result.errorDetails.push(`Linha ${row.n}: ${error.message}`);
            }

            if (onProgress && (i + 1) % 20 === 0) {
                onProgress({ phase: 'creating', current: i + 1, total: rows.length });
            }
        }

        if (onProgress) onProgress({ phase: 'done', result });

    } catch (error) {
        if (onProgress) onProgress({ phase: 'error', message: error.message });
        throw error;
    }

    return result;
}
