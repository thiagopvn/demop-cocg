/**
 * Notas de conclusão de manutenção.
 *
 * O registro gravado em `completionNotes` continua no formato
 * "[CONFORME PREVISTO] <detalhe>" (compatível com o histórico antigo), mas a tela
 * mostra o marcador como um selo e o detalhe como texto. `gerarDetalheConclusao`
 * transforma o que foi solicitado ("VERIFICAR NÍVEL DE ÓLEO DO MOTOR") numa frase
 * do que foi executado, sem inventar medições.
 */

export const TAG_CONFORME = '[CONFORME PREVISTO]';

const PERIODO = {
    diaria: 'diária', semanal: 'semanal', mensal: 'mensal', trimestral: 'trimestral', semestral: 'semestral', anual: 'anual',
    cada_90_dias: 'de 90 dias', cada_120_dias: 'de 120 dias', cada_180_dias: 'de 180 dias', cada_365_dias: 'de 365 dias',
    corretiva: 'corretiva', reparo: 'de reparo',
};

/** Verbos no imperativo/infinitivo (como a descrição é cadastrada) -> frase do que foi feito. */
const VERBOS = [
    { re: /^(verificar|checar|conferir)\s+e\s+(limpar)\s+/, frase: (o) => `Realizadas a verificação e a limpeza de ${o}; sem anomalias registradas.` },
    { re: /^(verificar|checar|conferir)\s+e\s+(ajustar|regular)\s+/, frase: (o) => `Realizados a verificação e o ajuste de ${o}, dentro do especificado.` },
    { re: /^(verificar|checar|conferir)\s+e\s+(trocar|substituir)\s+/, frase: (o) => `${cap(o)}: verificação realizada e substituição efetuada conforme previsto.` },
    { re: /^(verificar|checar|conferir|inspecionar|examinar)\s+/, frase: (o) => `Realizada a verificação de ${o}; nenhuma anomalia encontrada.` },
    { re: /^(limpar|higienizar)\s+/, frase: (o) => `Realizada a limpeza de ${o} conforme o procedimento.` },
    { re: /^(trocar|substituir|renovar)\s+/, frase: (o) => `Realizada a substituição de ${o} conforme previsto.` },
    { re: /^(lubrificar|engraxar)\s+/, frase: (o) => `Realizada a lubrificação de ${o}.` },
    { re: /^(ajustar|regular|calibrar|apertar|reapertar)\s+/, frase: (o) => `Realizado o ajuste de ${o}, dentro do especificado.` },
    { re: /^(testar|acionar)\s+/, frase: (o) => `Realizado o teste de ${o}; funcionamento normal.` },
    { re: /^(lavar)\s+/, frase: (o) => `Realizada a lavagem ${o}.` },
    { re: /^(rebarbar|afiar|amolar)\s+/, frase: (o) => `Realizada a afiação/rebarbação de ${o}.` },
    { re: /^(revisar)\s+/, frase: (o) => `Realizada a revisão de ${o}; sem pendências.` },
    { re: /^(ventilar|drenar|purgar)\s+/, frase: (o) => `Realizada a drenagem/ventilação de ${o}.` },
    { re: /^(abastecer|completar)\s+/, frase: (o) => `Realizado o abastecimento de ${o}.` },
    { re: /^(carregar|recarregar)\s+/, frase: (o) => `Realizada a recarga de ${o}.` },
    { re: /^(medir)\s+/, frase: (o) => `Realizada a medição de ${o}, dentro do especificado.` },
    { re: /^(desmontar|montar|instalar|remover|retirar)\s+/, frase: (o, v) => `Realizado o procedimento de ${v} de ${o}.` },
];

/** Formas nominais ("LUBRIFICAÇÃO DO ROLAMENTO", "TROCA DO ÓLEO", "VERIFICAÇÃO E AJUSTE DO TORQUE"). */
const NOMINAL = /^(verificação|checagem|inspeção|limpeza|troca|substituição|lubrificação|ajuste|teste|lavagem|revisão|drenagem|abastecimento|recarga|medição|calibração|aperto|reaperto|manutenção|regulagem|higienização)\b/;

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const limparEspacos = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** Divide "TROCAR ÓLEO - REVISÃO INICIAL (ATÉ 20H)" em { base, contexto }. */
function separarContexto(descricao) {
    let texto = limparEspacos(descricao).toLowerCase();
    let contexto = '';
    const idx = texto.indexOf(' - ');
    if (idx > 0) { contexto = texto.slice(idx + 3).trim(); texto = texto.slice(0, idx).trim(); }
    return { base: texto, contexto };
}

/**
 * Gera o detalhe do que foi executado a partir do que estava previsto.
 * @param {{ description?: string, type?: string, recurrenceType?: string, materialDescription?: string }} m
 */
export function gerarDetalheConclusao(m = {}) {
    const { base, contexto } = separarContexto(m.description);
    if (!base) return 'Procedimento executado integralmente conforme previsto.';

    let frase = null;
    for (const v of VERBOS) {
        const match = base.match(v.re);
        if (match) {
            const objeto = base.slice(match[0].length).trim();
            frase = objeto ? v.frase(objeto, match[1]) : `Realizado o procedimento "${base}".`;
            break;
        }
    }
    if (!frase) frase = NOMINAL.test(base) ? `Realizada a ${base}; sem pendências.` : `Executado o procedimento previsto: ${base}.`;

    // "de o sabre" -> "do sabre", "de a corrente" -> "da corrente"
    frase = frase.replace(/\bde o\b/g, 'do').replace(/\bde a\b/g, 'da').replace(/\bde os\b/g, 'dos').replace(/\bde as\b/g, 'das');

    const periodo = PERIODO[m.type] || PERIODO[m.recurrenceType] || '';
    const partes = [cap(frase)];
    if (contexto) partes.push(`Referência do plano: ${contexto}.`);
    partes.push(periodo ? `Item cumprido integralmente conforme o plano de manutenção ${periodo}.` : 'Item cumprido integralmente conforme o plano de manutenção.');
    return partes.join(' ');
}

/** Lê o campo gravado: { conformePrevisto, texto }. */
export function separarNotas(notes) {
    const s = String(notes || '').trim();
    const conformePrevisto = s.toUpperCase().startsWith(TAG_CONFORME);
    const texto = conformePrevisto ? s.slice(TAG_CONFORME.length).trim() : s;
    return { conformePrevisto, texto };
}

/** Monta o valor a gravar em `completionNotes`. */
export function montarNotasConclusao({ conformePrevisto, texto }) {
    const t = limparEspacos(texto);
    return conformePrevisto ? `${TAG_CONFORME} ${t}`.trim() : t;
}

/** true quando o registro só tem o marcador, sem nenhum detalhe. */
export const notasSemDetalhe = (notes) => {
    const { conformePrevisto, texto } = separarNotas(notes);
    return conformePrevisto && !texto;
};
