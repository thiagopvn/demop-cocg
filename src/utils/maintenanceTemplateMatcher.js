import MAINTENANCE_TEMPLATES from '../data/maintenanceTemplates';

/**
 * Remove acentos de uma string para comparação case-insensitive
 */
const removeAccents = (str) =>
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Normaliza texto para matching: lowercase, sem acentos, sem caracteres especiais extras
 */
const normalize = (str) =>
    removeAccents((str || '').toLowerCase().trim());

/**
 * Encontra templates de manutenção que correspondem a um material.
 *
 * Lógica de matching:
 * 1. Procura por keyword no description do material (obrigatório)
 * 2. Se template tem brand, verifica se o description contém a brand
 * 3. Se match de brand, pontua mais alto
 * 4. Se não há match de brand mas keyword bate, é um fallback
 *
 * @param {string} materialDescription - Descrição do material (ex: "MOTOSSERRA STIHL MS 170 SN-12345")
 * @returns {Array} Templates que correspondem, ordenados por relevância (melhor primeiro)
 */
export function findMatchingTemplates(materialDescription) {
    if (!materialDescription) return [];

    const desc = normalize(materialDescription);
    const matches = [];

    for (const template of MAINTENANCE_TEMPLATES) {
        let keywordMatch = false;
        let brandMatch = false;
        let score = 0;

        // Verificar keywords
        for (const keyword of template.keywords) {
            if (desc.includes(normalize(keyword))) {
                keywordMatch = true;
                score += 10;
                break;
            }
        }

        if (!keywordMatch) continue;

        // Verificar exclusões
        if (template.excludeKeywords) {
            const excluded = template.excludeKeywords.some(ex => desc.includes(normalize(ex)));
            if (excluded) continue;
        }

        // Verificar brand
        if (template.brand) {
            if (desc.includes(normalize(template.brand))) {
                brandMatch = true;
                score += 20; // Brand match é mais relevante
            }
        } else {
            // Template sem brand -> match genérico
            brandMatch = true; // Aceita direto
            score += 5;
        }

        if (keywordMatch) {
            matches.push({
                ...template,
                score,
                brandMatch,
                keywordMatch,
            });
        }
    }

    // Ordenar: brand matches primeiro, depois por score
    matches.sort((a, b) => {
        if (a.brandMatch !== b.brandMatch) return b.brandMatch ? 1 : -1;
        return b.score - a.score;
    });

    return matches;
}

/**
 * Seleciona o melhor template para um material.
 *
 * Prioridade:
 * 1. Match por keyword + brand (ex: "MOTOSSERRA" + "STIHL")
 * 2. Match por keyword apenas (ex: "MOTOSSERRA" sem brand reconhecida)
 *    Nesse caso, retorna o primeiro template com brand=null, ou o primeiro da lista
 *
 * @param {string} materialDescription
 * @returns {Object|null} O melhor template, ou null se nenhum match
 */
export function findBestTemplate(materialDescription) {
    const matches = findMatchingTemplates(materialDescription);
    if (matches.length === 0) return null;

    // Se o melhor match tem brand match, retorna ele
    if (matches[0].brandMatch) return matches[0];

    // Se nenhum tem brand match, retorna o sem brand ou o primeiro
    const genericMatch = matches.find(m => !m.brand);
    return genericMatch || matches[0];
}

/**
 * Calcula a data prevista (dueDate) para uma manutenção, baseado no tipo e índice de staggering.
 * Reproduz o padrão do CSV original que distribui as datas para evitar acúmulo.
 *
 * @param {string} type - Tipo de manutenção (diaria, semanal, mensal, etc.)
 * @param {number} equipmentIndex - Índice do equipamento (para staggering entre equipamentos)
 * @param {number} itemIndex - Índice do item dentro do mesmo tipo (para staggering dentro do tipo)
 * @param {Date} [baseDate] - Data base (default: hoje)
 * @returns {Date} Data prevista
 */
export function computeDueDate(type, equipmentIndex = 0, itemIndex = 0, baseDate = null) {
    const d = baseDate ? new Date(baseDate) : new Date();
    d.setHours(9, 0, 0, 0);

    // Offsets base que reproduzem o padrão do CSV (dias a partir de hoje)
    const baseOffsets = {
        diaria: 1,
        semanal: 1,
        mensal: 6,
        trimestral: 12,
        semestral: 22,
        anual: 30,
        cada_90_dias: 12,
        cada_120_dias: 16,
        cada_180_dias: 22,
        cada_365_dias: 30,
    };

    const offset = (baseOffsets[type] || 1) + equipmentIndex + Math.floor(itemIndex / 3);
    d.setDate(d.getDate() + offset);
    return d;
}

/**
 * Verifica se um material já tem manutenções agendadas para um template específico.
 * Evita duplicação no seed.
 *
 * @param {Array} existingMaintenances - Manutenções existentes do material
 * @param {Object} maintenanceItem - Item do template a verificar
 * @returns {boolean} true se já existe manutenção similar
 */
export function hasExistingMaintenance(existingMaintenances, maintenanceItem) {
    if (!existingMaintenances || existingMaintenances.length === 0) return false;

    const normalizedDesc = normalize(maintenanceItem.description);

    return existingMaintenances.some(existing => {
        const existingDesc = normalize(existing.description || '');
        const existingType = existing.type || '';

        // Match se tipo é igual e descrição contém texto similar
        return existingType === maintenanceItem.type &&
            (existingDesc.includes(normalizedDesc) || normalizedDesc.includes(existingDesc));
    });
}

export default {
    findMatchingTemplates,
    findBestTemplate,
    computeDueDate,
    hasExistingMaintenance,
};
