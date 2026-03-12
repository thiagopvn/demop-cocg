const STOP_WORDS = new Set([
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'com', 'e', 'ou', 'um', 'uma', 'o', 'a', 'os', 'as'
]);

export const normalizeName = (name) =>
  (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();

export const getSignificantWords = (name) =>
  normalizeName(name)
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

export const calculateSimilarity = (name1, name2) => {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0;

  const words1 = new Set(getSignificantWords(name1));
  const words2 = new Set(getSignificantWords(name2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  const jaccard = intersection / union;

  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return Math.max(jaccard, 0.7);
  }

  return jaccard;
};

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

export const findDuplicateGroups = (materials, threshold = 0.6) => {
  const groups = [];
  const assigned = new Set();

  for (let i = 0; i < materials.length; i++) {
    if (assigned.has(materials[i].id)) continue;

    const group = [materials[i]];

    for (let j = i + 1; j < materials.length; j++) {
      if (assigned.has(materials[j].id)) continue;

      const sim = calculateSimilarity(materials[i].description, materials[j].description);
      if (sim >= threshold) {
        group.push(materials[j]);
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
