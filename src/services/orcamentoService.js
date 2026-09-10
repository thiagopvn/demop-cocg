import {
    addDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import db, { orcamentoCaixaCollection, orcamentoNotasCollection, orcamentoSetoresCollection } from '../firebase/db';
import { logAudit } from '../firebase/auditLog';

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

/** Setores de destino criados na primeira abertura do módulo (depois a lista é toda editável). */
export const SETORES_PADRAO = ['DEMOP', 'SST', 'SSCO', 'SSMT', 'COMANDANTE'];

/** Tipos de movimento do caixa. `sinal` diz como o valor entra na conta do saldo. */
export const TIPOS_CAIXA = {
    saque: { label: 'Saque no banco', descricao: 'Dinheiro sacado no banco e colocado no caixa', sinal: 1, cor: 'success' },
    retorno: { label: 'Devolução ao banco', descricao: 'Dinheiro retirado do caixa e depositado de volta', sinal: -1, cor: 'warning' },
    ajuste: { label: 'Ajuste de conferência', descricao: 'Diferença encontrada ao contar o dinheiro do caixa', sinal: 1, cor: 'info' },
};

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/* ------------------------------------------------------------------ */
/* Texto                                                               */
/* ------------------------------------------------------------------ */

/** Tudo que o militar digita vai para caixa alta (acentos preservados) e sem espaços duplicados. */
export const caixaAlta = (s) => String(s ?? '').toUpperCase().replace(/\s+/g, ' ').trimStart();
const limpar = (s) => caixaAlta(s).trim();

/* ------------------------------------------------------------------ */
/* CNPJ                                                                */
/* ------------------------------------------------------------------ */

export const somenteDigitos = (s) => String(s ?? '').replace(/\D/g, '');

/** "12345678000195" -> "12.345.678/0001-95" (funciona com CNPJ parcial enquanto digita). */
export const formatarCnpj = (v) => {
    const d = somenteDigitos(v).slice(0, 14);
    return d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
};

/** Valida os dois dígitos verificadores. */
export const cnpjValido = (v) => {
    const d = somenteDigitos(v);
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
    const calc = (base) => {
        let peso = base.length - 7;
        let soma = 0;
        for (let i = 0; i < base.length; i++) {
            soma += Number(base[i]) * peso--;
            if (peso < 2) peso = 9;
        }
        const r = soma % 11;
        return r < 2 ? 0 : 11 - r;
    };
    const d1 = calc(d.slice(0, 12));
    const d2 = calc(d.slice(0, 12) + d1);
    return d1 === Number(d[12]) && d2 === Number(d[13]);
};

/* ------------------------------------------------------------------ */
/* Dinheiro                                                            */
/* ------------------------------------------------------------------ */

export const fmtMoeda = (n) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
/** Versão curta para eixos de gráfico: R$ 1,2 mil / R$ 3,4 mi. */
export const fmtMoedaCurta = (n) => {
    const v = Number(n) || 0;
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
    if (abs >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
    return fmtMoeda(v);
};
/** Arredonda para centavos (evita 0.1 + 0.2). */
export const centavos = (n) => Math.round((Number(n) || 0) * 100) / 100;

/* ------------------------------------------------------------------ */
/* Datas                                                               */
/* ------------------------------------------------------------------ */

export const paraDate = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate();
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

/** Date -> "AAAA-MM-DD" (para <input type="date">). */
export const dataParaInput = (d) => {
    const x = paraDate(d) || new Date();
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
/** "AAAA-MM-DD" -> Date ao meio-dia local (não escorrega de dia por fuso). */
export const inputParaDate = (s) => (s ? new Date(`${s}T12:00:00`) : new Date());

export const fmtData = (v) => {
    const d = paraDate(v);
    return d ? d.toLocaleDateString('pt-BR') : '—';
};

/** Chave "AAAA-MM" para agrupar por mês. */
export const chaveMes = (ano, mes) => `${ano}-${String(mes).padStart(2, '0')}`;
export const rotuloMes = (ano, mes, curto = true) => `${(curto ? MESES_CURTO : MESES)[mes - 1]}/${String(ano).slice(-2)}`;

/* ------------------------------------------------------------------ */
/* Normalização dos documentos                                         */
/* ------------------------------------------------------------------ */

function camposDeData(data) {
    const d = paraDate(data) || new Date();
    return { data: Timestamp.fromDate(d), ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

/** Monta o documento da nota a partir do formulário. Lança erro com mensagem amigável se inválido. */
export function montarNota(form) {
    const cnpj = somenteDigitos(form.cnpj);
    if (cnpj.length !== 14) throw new Error('Informe o CNPJ completo (14 dígitos).');
    if (!cnpjValido(cnpj)) throw new Error('CNPJ inválido — confira os dígitos.');
    const valor = centavos(form.valor);
    if (!(valor > 0)) throw new Error('Informe o valor da nota.');
    return {
        cnpj,
        cnpjFormatado: formatarCnpj(cnpj),
        empresa: limpar(form.empresa),
        valor,
        objeto: limpar(form.objeto),
        setor: limpar(form.setor),
        militarNome: limpar(form.militarNome),
        militarRg: somenteDigitos(form.militarRg),
        observacoes: limpar(form.observacoes),
        numeroNota: limpar(form.numeroNota),
        ...camposDeData(form.data),
        ...camposDePagamento(form.pago !== false, form.pagoEm),
    };
}

/** Situação do pagamento. Notas antigas (sem o campo) contam como pagas. */
export const estaPaga = (n) => n?.pago !== false;
function camposDePagamento(pago, pagoEm) {
    return { pago: Boolean(pago), pagoEm: pago ? Timestamp.fromDate(paraDate(pagoEm) || new Date()) : null };
}

export function montarMovimentoCaixa(form) {
    const tipo = TIPOS_CAIXA[form.tipo] ? form.tipo : 'saque';
    const valor = centavos(form.valor);
    if (tipo === 'ajuste') {
        if (valor === 0) throw new Error('O ajuste não pode ser zero.');
    } else if (!(valor > 0)) {
        throw new Error('Informe o valor.');
    }
    return {
        tipo,
        valor, // ajuste pode ser negativo; saque/retorno sempre positivos (o sinal vem do tipo)
        militarNome: limpar(form.militarNome),
        militarRg: somenteDigitos(form.militarRg),
        descricao: limpar(form.descricao),
        ...camposDeData(form.data),
    };
}

/** Quanto um movimento soma (ou subtrai) do caixa. */
export const efeitoNoCaixa = (m) => (TIPOS_CAIXA[m.tipo]?.sinal ?? 1) * (Number(m.valor) || 0);

/** Saldo em caixa = saques − devoluções ± ajustes − notas fiscais PAGAS (as não pagas ainda não saíram do caixa). */
export function calcularSaldoCaixa(movimentos, notas) {
    const entradas = movimentos.reduce((s, m) => s + efeitoNoCaixa(m), 0);
    const gastos = notas.filter(estaPaga).reduce((s, n) => s + (Number(n.valor) || 0), 0);
    return centavos(entradas - gastos);
}

/** Total e quantidade das notas ainda não pagas. */
export function resumoPendentes(notas) {
    const pendentes = notas.filter((n) => !estaPaga(n));
    return { qtd: pendentes.length, valor: centavos(pendentes.reduce((s, n) => s + (Number(n.valor) || 0), 0)) };
}

/** Marca a nota como paga / não paga direto na tabela. */
export async function alterarPagamentoNota(nota, pago, user) {
    const a = autor(user);
    const dados = camposDePagamento(pago, pago ? new Date() : null);
    await updateDoc(doc(db, 'orcamento_notas', nota.id), { ...dados, atualizadoEm: serverTimestamp(), atualizadoPor: a.userId, atualizadoPorNome: a.userName });
    logAudit({ action: 'orcamento_nota_pagamento', ...a, targetCollection: 'orcamento_notas', targetId: nota.id, targetName: resumoNota(nota), details: { pago, valor: nota.valor, setor: nota.setor } });
}

/* ------------------------------------------------------------------ */
/* CRUD — notas fiscais                                                */
/* ------------------------------------------------------------------ */

const autor = (user) => ({ userId: user?.userId || null, userName: user?.userName || user?.fullName || user?.username || '' });
const resumoNota = (n) => `${n.cnpjFormatado} · ${fmtMoeda(n.valor)}${n.objeto ? ` · ${n.objeto}` : ''}`;

export async function criarNota(form, user) {
    const dados = montarNota(form);
    const a = autor(user);
    const ref = await addDoc(orcamentoNotasCollection, {
        ...dados,
        criadoEm: serverTimestamp(),
        criadoPor: a.userId,
        criadoPorNome: a.userName,
        atualizadoEm: serverTimestamp(),
    });
    logAudit({ action: 'orcamento_nota_create', ...a, targetCollection: 'orcamento_notas', targetId: ref.id, targetName: resumoNota(dados), details: { setor: dados.setor, militar: dados.militarNome, rg: dados.militarRg, valor: dados.valor } });
    return ref.id;
}

export async function atualizarNota(id, form, user) {
    const dados = montarNota(form);
    const a = autor(user);
    await updateDoc(doc(db, 'orcamento_notas', id), { ...dados, atualizadoEm: serverTimestamp(), atualizadoPor: a.userId, atualizadoPorNome: a.userName });
    logAudit({ action: 'orcamento_nota_update', ...a, targetCollection: 'orcamento_notas', targetId: id, targetName: resumoNota(dados), details: { setor: dados.setor, militar: dados.militarNome, rg: dados.militarRg, valor: dados.valor } });
}

export async function excluirNota(nota, user) {
    const a = autor(user);
    await deleteDoc(doc(db, 'orcamento_notas', nota.id));
    logAudit({ action: 'orcamento_nota_delete', ...a, targetCollection: 'orcamento_notas', targetId: nota.id, targetName: resumoNota(nota), details: { setor: nota.setor, militar: nota.militarNome, valor: nota.valor } });
}

/* ------------------------------------------------------------------ */
/* CRUD — caixa                                                        */
/* ------------------------------------------------------------------ */

const resumoCaixa = (m) => `${TIPOS_CAIXA[m.tipo]?.label || m.tipo} · ${fmtMoeda(m.valor)}`;

export async function criarMovimentoCaixa(form, user) {
    const dados = montarMovimentoCaixa(form);
    const a = autor(user);
    const ref = await addDoc(orcamentoCaixaCollection, {
        ...dados,
        criadoEm: serverTimestamp(),
        criadoPor: a.userId,
        criadoPorNome: a.userName,
        atualizadoEm: serverTimestamp(),
    });
    logAudit({ action: 'orcamento_caixa_create', ...a, targetCollection: 'orcamento_caixa', targetId: ref.id, targetName: resumoCaixa(dados), details: { tipo: dados.tipo, valor: dados.valor, militar: dados.militarNome } });
    return ref.id;
}

export async function atualizarMovimentoCaixa(id, form, user) {
    const dados = montarMovimentoCaixa(form);
    const a = autor(user);
    await updateDoc(doc(db, 'orcamento_caixa', id), { ...dados, atualizadoEm: serverTimestamp(), atualizadoPor: a.userId, atualizadoPorNome: a.userName });
    logAudit({ action: 'orcamento_caixa_update', ...a, targetCollection: 'orcamento_caixa', targetId: id, targetName: resumoCaixa(dados), details: { tipo: dados.tipo, valor: dados.valor } });
}

export async function excluirMovimentoCaixa(mov, user) {
    const a = autor(user);
    await deleteDoc(doc(db, 'orcamento_caixa', mov.id));
    logAudit({ action: 'orcamento_caixa_delete', ...a, targetCollection: 'orcamento_caixa', targetId: mov.id, targetName: resumoCaixa(mov), details: { tipo: mov.tipo, valor: mov.valor } });
}

/* ------------------------------------------------------------------ */
/* CRUD — setores de destino                                           */
/* ------------------------------------------------------------------ */

/** Cria os setores padrão quando a lista está vazia (chamado uma vez pela tela). */
export async function semearSetores() {
    const snap = await getDocs(orcamentoSetoresCollection);
    if (!snap.empty) return;
    const batch = writeBatch(db);
    SETORES_PADRAO.forEach((nome, ordem) => {
        batch.set(doc(orcamentoSetoresCollection), { nome, ordem, criadoEm: serverTimestamp() });
    });
    await batch.commit();
}

export async function adicionarSetor(nome, setoresAtuais, user) {
    const n = limpar(nome);
    if (!n) throw new Error('Informe o nome do setor.');
    const existente = setoresAtuais.find((s) => s.nome === n);
    if (existente) return existente.nome;
    const ordem = setoresAtuais.reduce((m, s) => Math.max(m, s.ordem ?? 0), -1) + 1;
    const ref = await addDoc(orcamentoSetoresCollection, { nome: n, ordem, criadoEm: serverTimestamp() });
    logAudit({ action: 'orcamento_setor_create', ...autor(user), targetCollection: 'orcamento_setores', targetId: ref.id, targetName: n });
    return n;
}

/** Renomeia o setor e atualiza todas as notas que apontavam para o nome antigo. */
export async function renomearSetor(setor, novoNome, setoresAtuais, user) {
    const n = limpar(novoNome);
    if (!n) throw new Error('Informe o nome do setor.');
    if (n === setor.nome) return;
    if (setoresAtuais.some((s) => s.id !== setor.id && s.nome === n)) throw new Error(`Já existe o setor ${n}.`);
    const notas = await getDocs(query(orcamentoNotasCollection, where('setor', '==', setor.nome)));
    const batch = writeBatch(db);
    batch.update(doc(db, 'orcamento_setores', setor.id), { nome: n });
    notas.docs.forEach((d) => batch.update(d.ref, { setor: n }));
    await batch.commit();
    logAudit({ action: 'orcamento_setor_update', ...autor(user), targetCollection: 'orcamento_setores', targetId: setor.id, targetName: `${setor.nome} → ${n}`, details: { notasAtualizadas: notas.size } });
}

export async function excluirSetor(setor, user) {
    await deleteDoc(doc(db, 'orcamento_setores', setor.id));
    logAudit({ action: 'orcamento_setor_delete', ...autor(user), targetCollection: 'orcamento_setores', targetId: setor.id, targetName: setor.nome });
}

/* ------------------------------------------------------------------ */
/* Filtros e agregações (usados pela tabela e pelo painel)             */
/* ------------------------------------------------------------------ */

const contem = (campo, termo) => String(campo || '').toUpperCase().includes(termo);

/**
 * Filtra notas por ano, mês, militar (nome de guerra), RG, setor e busca livre
 * (CNPJ, empresa, objeto, observações, nº da nota). Campos vazios não filtram.
 */
export function filtrarNotas(notas, f = {}) {
    const nome = limpar(f.militarNome);
    const rg = somenteDigitos(f.militarRg);
    const busca = limpar(f.busca);
    const buscaDigitos = somenteDigitos(f.busca);
    return notas.filter((n) => {
        if (f.ano && f.ano !== 'todos' && Number(n.ano) !== Number(f.ano)) return false;
        if (f.mes && f.mes !== 'todos' && Number(n.mes) !== Number(f.mes)) return false;
        if (f.setor && f.setor !== 'todos' && (n.setor || '') !== f.setor) return false;
        if (f.pagamento === 'pagas' && !estaPaga(n)) return false;
        if (f.pagamento === 'pendentes' && estaPaga(n)) return false;
        if (nome && !contem(n.militarNome, nome)) return false;
        if (rg && !String(n.militarRg || '').includes(rg)) return false;
        if (busca) {
            const bateTexto = contem(n.empresa, busca) || contem(n.objeto, busca) || contem(n.observacoes, busca) || contem(n.numeroNota, busca) || contem(n.militarNome, busca);
            const bateCnpj = buscaDigitos.length >= 3 && String(n.cnpj || '').includes(buscaDigitos);
            if (!bateTexto && !bateCnpj) return false;
        }
        return true;
    });
}

export function filtrarMovimentos(movs, f = {}) {
    return movs.filter((m) => {
        if (f.ano && f.ano !== 'todos' && Number(m.ano) !== Number(f.ano)) return false;
        if (f.mes && f.mes !== 'todos' && Number(m.mes) !== Number(f.mes)) return false;
        if (f.tipo && f.tipo !== 'todos' && m.tipo !== f.tipo) return false;
        return true;
    });
}

/** Soma `valor` agrupando por uma chave; devolve [{ chave, nome, valor, qtd }] em ordem decrescente. */
export function agruparPor(itens, chaveFn, nomeFn = chaveFn) {
    const mapa = new Map();
    for (const it of itens) {
        const chave = chaveFn(it) || '—';
        const atual = mapa.get(chave) || { chave, nome: nomeFn(it) || chave, valor: 0, qtd: 0 };
        atual.valor = centavos(atual.valor + (Number(it.valor) || 0));
        atual.qtd += 1;
        mapa.set(chave, atual);
    }
    return [...mapa.values()].sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Anos presentes nas notas e nos movimentos (mais o atual), do mais recente ao mais antigo. */
export function anosDisponiveis(...listas) {
    const anos = new Set([new Date().getFullYear()]);
    listas.flat().forEach((x) => { if (x?.ano) anos.add(Number(x.ano)); });
    return [...anos].sort((a, b) => b - a);
}
