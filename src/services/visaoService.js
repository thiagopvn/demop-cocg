import { compressImage } from '../utils/imageUpload';
import { callIdentificarMaterialPorFoto } from '../firebase/functions';
import { calculateSimilarity, normalizeName } from '../utils/materialSimilarity';

/**
 * Busca por foto ("Google Lens do DEMOP").
 *
 *  1. `identificarMaterialPorFoto(file)` — comprime a foto no aparelho, manda para a
 *     Cloud Function e recebe o nome do objeto + termos de busca (etapa paga, ~R$ 0,06).
 *  2. `buscarMateriaisPorTermos(termos, materials)` — procura esses termos entre os
 *     materiais já carregados no app (grátis), devolvendo também os semelhantes.
 */

const FOTO_MAX_LADO = 1024;
const FOTO_QUALIDADE = 0.8;

const arquivoParaBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
        reader.onerror = () => reject(new Error('Não foi possível ler a foto.'));
        reader.readAsDataURL(file);
    });

/** Comprime a foto e chama o reconhecimento. Devolve também a URL de pré-visualização. */
export async function identificarMaterialPorFoto(file) {
    if (!file) throw new Error('Nenhuma foto selecionada.');
    const comprimida = await compressImage(file, { maxDimension: FOTO_MAX_LADO, quality: FOTO_QUALIDADE });
    const imagemBase64 = await arquivoParaBase64(comprimida);
    const resultado = await callIdentificarMaterialPorFoto({ imagemBase64, mediaType: 'image/jpeg' });
    return { ...resultado, tamanhoBytes: comprimida.size };
}

/** Mensagem amigável para os erros da Cloud Function / rede. */
export const mensagemErroVisao = (e) => {
    const code = e?.code || '';
    if (code.includes('permission-denied')) return 'Seu perfil não pode usar a busca por foto.';
    if (code.includes('unauthenticated')) return 'Sessão expirada. Entre de novo para usar a busca por foto.';
    if (code.includes('resource-exhausted')) return 'Muitas fotos em pouco tempo. Aguarde alguns segundos.';
    if (code.includes('not-found')) return 'O reconhecimento por foto ainda não foi publicado no servidor.';
    return e?.message || 'Não foi possível reconhecer a foto.';
};

/**
 * Pontua cada material contra os termos devolvidos pelo reconhecimento.
 * Termos mais prováveis (início da lista) pesam mais; conter o termo inteiro
 * na descrição vale mais que só compartilhar palavras.
 * Retorna [{ material, pontuacao, termo }] ordenado, incluindo os semelhantes.
 */
export function buscarMateriaisPorTermos(termos = [], materials = [], { limite = 10, minimo = 0.3 } = {}) {
    const lista = termos.map((t) => String(t || '').trim()).filter((t) => t.length >= 2);
    if (!lista.length) return [];
    const normTermos = lista.map((t) => normalizeName(t));

    const resultados = [];
    for (const m of materials) {
        const desc = m.description || '';
        if (!desc) continue;
        const normDesc = normalizeName(desc);
        let melhor = 0;
        let termoMelhor = lista[0];
        for (let i = 0; i < lista.length; i += 1) {
            const peso = 1 - i * 0.08; // 1, 0.92, 0.84...
            let s = calculateSimilarity(lista[i], desc);
            if (normTermos[i] && normDesc.includes(normTermos[i])) s = Math.max(s, 0.9);
            s *= peso;
            if (s > melhor) { melhor = s; termoMelhor = lista[i]; }
        }
        if (melhor >= minimo) resultados.push({ material: m, pontuacao: melhor, termo: termoMelhor });
    }
    resultados.sort((a, b) => b.pontuacao - a.pontuacao || (a.material.description || '').localeCompare(b.material.description || '', 'pt-BR'));
    return resultados.slice(0, limite);
}
