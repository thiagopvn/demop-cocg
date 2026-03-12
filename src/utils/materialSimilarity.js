const STOP_WORDS = new Set([
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'com', 'e', 'ou', 'um', 'uma', 'o', 'a', 'os', 'as'
]);

/**
 * Normaliza string: lowercase, remove acentos, remove caracteres especiais.
 */
export const normalizeName = (name) =>
  (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

/**
 * Retorna palavras significativas (sem stop words, min 2 chars).
 */
export const getSignificantWords = (text) =>
  normalizeName(text)
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

/**
 * Extrai número de série/patrimônio e a base descritiva do nome.
 *
 * Exemplos:
 *   "02053146 - CAPACETE PRETO GALLET F1" → { serial: "02053146", base: "CAPACETE PRETO GALLET F1" }
 *   "Pinça de manejo"                     → { serial: null,       base: "Pinça de manejo" }
 *   "CAPACETE PRETO (SN 01234)"           → { serial: "01234",    base: "CAPACETE PRETO" }
 */
export const extractSerialAndBase = (name) => {
  if (!name) return { serial: null, base: '' };
  const trimmed = name.trim();

  // Padrão 1: Serial no início com separador  "12345678 - Descrição"
  const leadingWithSep = trimmed.match(/^(\d{4,})\s*[-–—]\s*(.+)$/);
  if (leadingWithSep) {
    return { serial: leadingWithSep[1], base: leadingWithSep[2].trim() };
  }

  // Padrão 2: Serial no início sem separador  "12345678 DESCRIÇÃO" (seguido de letra)
  const leadingNoSep = trimmed.match(/^(\d{4,})\s+([A-Za-zÀ-ÿ].+)$/);
  if (leadingNoSep) {
    return { serial: leadingNoSep[1], base: leadingNoSep[2].trim() };
  }

  // Padrão 3: Serial no final com separador  "Descrição - 12345678"
  const trailingWithSep = trimmed.match(/^(.+?)\s*[-–—]\s*(\d{4,})$/);
  if (trailingWithSep) {
    return { serial: trailingWithSep[2], base: trailingWithSep[1].trim() };
  }

  // Padrão 4: Serial entre parênteses/colchetes  "(12345678)"  "[12345678]"
  const inBrackets = trimmed.match(/^(.+?)\s*[(\[]\s*(\d{4,})\s*[)\]]\s*$/);
  if (inBrackets) {
    return { serial: inBrackets[2], base: inBrackets[1].trim() };
  }

  return { serial: null, base: trimmed };
};

/**
 * Calcula similaridade apenas entre bases textuais (Jaccard + containment).
 */
const calculateBaseSimilarity = (base1, base2) => {
  const norm1 = normalizeName(base1);
  const norm2 = normalizeName(base2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0;

  const words1 = new Set(getSignificantWords(base1));
  const words2 = new Set(getSignificantWords(base2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  const jaccard = intersection / union;

  // Boost se uma base contém a outra
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return Math.max(jaccard, 0.7);
  }

  return jaccard;
};

/**
 * Calcula similaridade com inteligência para números de série.
 *
 * REGRA DE OURO:
 *   mesma base textual + seriais DIFERENTES  →  NÃO são duplicados (retorna 0).
 *   sem seriais (ou mesmo serial) + base similar  →  SÃO possíveis duplicados.
 */
export const calculateSimilarity = (name1, name2) => {
  const { serial: s1, base: b1 } = extractSerialAndBase(name1);
  const { serial: s2, base: b2 } = extractSerialAndBase(name2);

  // Ambos têm serial e são diferentes → verificar base
  if (s1 && s2 && s1 !== s2) {
    const baseSim = calculateBaseSimilarity(b1, b2);
    if (baseSim >= 0.5) {
      // Mesmo tipo de item mas patrimônios diferentes → NÃO duplicados
      return 0;
    }
  }

  // Comparar bases textuais
  return calculateBaseSimilarity(b1, b2);
};

/**
 * Encontra materiais similares a uma descrição (para o dialog de cadastro).
 */
export const findSimilarMaterials = (description, materials, excludeId = null, threshold = 0.5) => {
  if (!description || description.length < 3) return [];

  return materials
    .filter(m => m.id !== excludeId)
    .map(m => {
      const similarity = calculateSimilarity(description, m.description);
      return similarity >= threshold ? { ...m, similarity } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
};

/**
 * Agrupa materiais possivelmente duplicados.
 * Cada membro do grupo carrega o score de similaridade em relação ao primeiro item.
 */
export const findDuplicateGroups = (materials, threshold = 0.6) => {
  const groups = [];
  const assigned = new Set();

  for (let i = 0; i < materials.length; i++) {
    if (assigned.has(materials[i].id)) continue;

    const group = [{ ...materials[i], similarity: 1.0 }];

    for (let j = i + 1; j < materials.length; j++) {
      if (assigned.has(materials[j].id)) continue;

      const sim = calculateSimilarity(materials[i].description, materials[j].description);
      if (sim >= threshold) {
        group.push({ ...materials[j], similarity: sim });
        assigned.add(materials[j].id);
      }
    }

    if (group.length > 1) {
      groups.push(group);
      group.forEach(m => assigned.add(m.id));
    }
  }

  return groups;
};
