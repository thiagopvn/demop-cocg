import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import db from '../firebase/db';
import { findBestTemplate, computeDueDate, hasExistingMaintenance } from './maintenanceTemplateMatcher';

/**
 * Aplica manutenções de template a um material específico.
 * Verifica duplicações antes de criar.
 *
 * @param {Object} material - Documento do material { id, description, categoria, ... }
 * @param {Object} template - Template correspondente
 * @param {number} equipmentIndex - Índice para staggering de datas
 * @param {Array} existingMaintenances - Manutenções já existentes para esse material
 * @param {Function} [onProgress] - Callback de progresso (opcional)
 * @returns {Object} { created: number, skipped: number, errors: number }
 */
export async function applyTemplateToMaterial(material, template, equipmentIndex = 0, existingMaintenances = [], onProgress = null) {
    const result = { created: 0, skipped: 0, errors: 0 };

    // Agrupar por tipo para calcular itemIndex
    const typeCounters = {};

    for (const maintenance of template.maintenances) {
        // Controlar índice por tipo
        if (!typeCounters[maintenance.type]) typeCounters[maintenance.type] = 0;
        const itemIndex = typeCounters[maintenance.type]++;

        // Verificar se já existe manutenção similar
        if (hasExistingMaintenance(existingMaintenances, maintenance)) {
            result.skipped++;
            if (onProgress) onProgress({ type: 'skip', maintenance, reason: 'já existe' });
            continue;
        }

        try {
            const dueDate = computeDueDate(maintenance.type, equipmentIndex, itemIndex);

            const maintenanceDoc = {
                materialId: material.id,
                materialDescription: material.description,
                materialCategory: material.categoria || 'N/A',
                type: maintenance.type,
                dueDate: Timestamp.fromDate(dueDate),
                description: maintenance.description,
                priority: maintenance.priority,
                estimatedDuration: maintenance.estimatedDuration || 1,
                requiredParts: [],
                status: 'pendente',
                createdAt: Timestamp.now(),
                createdBy: 'Sistema',
                isRecurrent: true,
                recurrenceType: maintenance.type,
                customRecurrenceDays: null,
                recurrenceEndDate: null,
                recurrenceCount: 0,
                reminderDays: maintenance.reminderDays || 3,
            };

            await addDoc(collection(db, 'manutencoes'), maintenanceDoc);
            result.created++;

            if (onProgress) onProgress({ type: 'created', maintenance });
        } catch (error) {
            result.errors++;
            if (onProgress) onProgress({ type: 'error', maintenance, error });
        }
    }

    return result;
}

/**
 * Busca manutenções existentes para um material.
 *
 * @param {string} materialId
 * @returns {Array} Manutenções existentes
 */
async function getExistingMaintenances(materialId) {
    try {
        const q = query(
            collection(db, 'manutencoes'),
            where('materialId', '==', materialId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch {
        return [];
    }
}

/**
 * Executa o seed completo: percorre todos os materiais, identifica matches com templates,
 * e cria as manutenções programadas.
 *
 * @param {Array} materials - Lista de materiais da plataforma
 * @param {Function} [onProgress] - Callback de progresso { phase, current, total, material, template, detail }
 * @returns {Object} Resultado completo { totalMaterials, matched, unmatched, created, skipped, errors, details }
 */
export async function seedAllMaintenances(materials, onProgress = null) {
    const result = {
        totalMaterials: materials.length,
        matched: 0,
        unmatched: 0,
        created: 0,
        skipped: 0,
        errors: 0,
        details: [],
    };

    let equipmentIndex = 0;

    for (let i = 0; i < materials.length; i++) {
        const material = materials[i];

        if (onProgress) {
            onProgress({
                phase: 'matching',
                current: i + 1,
                total: materials.length,
                material: material.description,
            });
        }

        // Buscar template correspondente
        const template = findBestTemplate(material.description);

        if (!template) {
            result.unmatched++;
            result.details.push({
                material: material.description,
                materialId: material.id,
                template: null,
                status: 'sem_template',
                created: 0,
                skipped: 0,
            });
            continue;
        }

        result.matched++;

        if (onProgress) {
            onProgress({
                phase: 'applying',
                current: i + 1,
                total: materials.length,
                material: material.description,
                template: template.label,
            });
        }

        // Buscar manutenções existentes para evitar duplicação
        const existingMaintenances = await getExistingMaintenances(material.id);

        // Aplicar template
        const applyResult = await applyTemplateToMaterial(
            material,
            template,
            equipmentIndex,
            existingMaintenances,
            (detail) => {
                if (onProgress) {
                    onProgress({
                        phase: 'detail',
                        current: i + 1,
                        total: materials.length,
                        material: material.description,
                        template: template.label,
                        detail,
                    });
                }
            }
        );

        result.created += applyResult.created;
        result.skipped += applyResult.skipped;
        result.errors += applyResult.errors;
        result.details.push({
            material: material.description,
            materialId: material.id,
            template: template.label,
            templateId: template.id,
            status: 'aplicado',
            created: applyResult.created,
            skipped: applyResult.skipped,
            errors: applyResult.errors,
        });

        equipmentIndex++;
    }

    return result;
}

/**
 * Aplica manutenções de um template a um material recém-criado.
 * Versão simplificada para uso no MaterialDialog (após criar material).
 *
 * @param {Object} material - { id, description, categoria }
 * @param {Object} template - Template selecionado
 * @param {Array} selectedMaintenances - Índices das manutenções selecionadas (do template.maintenances)
 * @returns {Object} { created, errors }
 */
export async function applySelectedMaintenances(material, template, selectedMaintenances) {
    const result = { created: 0, errors: 0 };
    const typeCounters = {};

    for (const idx of selectedMaintenances) {
        const maintenance = template.maintenances[idx];
        if (!maintenance) continue;

        if (!typeCounters[maintenance.type]) typeCounters[maintenance.type] = 0;
        const itemIndex = typeCounters[maintenance.type]++;

        try {
            const dueDate = computeDueDate(maintenance.type, 0, itemIndex);

            const maintenanceDoc = {
                materialId: material.id,
                materialDescription: material.description,
                materialCategory: material.categoria || 'N/A',
                type: maintenance.type,
                dueDate: Timestamp.fromDate(dueDate),
                description: maintenance.description,
                priority: maintenance.priority,
                estimatedDuration: maintenance.estimatedDuration || 1,
                requiredParts: [],
                status: 'pendente',
                createdAt: Timestamp.now(),
                createdBy: 'Sistema',
                isRecurrent: true,
                recurrenceType: maintenance.type,
                customRecurrenceDays: null,
                recurrenceEndDate: null,
                recurrenceCount: 0,
                reminderDays: maintenance.reminderDays || 3,
            };

            await addDoc(collection(db, 'manutencoes'), maintenanceDoc);
            result.created++;
        } catch {
            result.errors++;
        }
    }

    return result;
}
