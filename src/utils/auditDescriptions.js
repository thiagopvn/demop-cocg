import { ACTION_LABELS } from '../firebase/auditLog';

/**
 * Transforma um registro de audit_logs numa descricao legivel e estruturada.
 * Usado na tela de Atividades (admingeral) e no historico de cada material.
 *
 * Retorna:
 *  - frase: o que aconteceu, em linguagem natural ("Cautelou 2 un. de MOTOSSERRA para Sd Silva")
 *  - alvo: item afetado (material, usuario, viatura...)
 *  - envolvido: militar/viatura envolvido na acao (alem de quem executou)
 *  - quantidade: numero de unidades, quando houver
 *  - extras: [{ label, value }] com os demais detalhes
 */

const TIPO_MOV = {
    cautela: 'Cautela',
    entrada: 'Entrada',
    'saída': 'Saída',
    saida: 'Saída',
    reparo: 'Inoperante / reparo',
    troca: 'Troca com viatura',
};

const CAMPO_LABELS = {
    description: 'Descrição',
    categoria: 'Categoria',
    estoque_total: 'Estoque total',
    estoque_atual: 'Estoque atual',
    qtd_inoperante: 'Unid. inoperantes',
    maintenance_status: 'Status',
    image: 'Foto',
    full_name: 'Nome',
    email: 'E-mail',
    telefone: 'Telefone',
    role: 'Papel',
    rg: 'RG',
    OBM: 'OBM',
    username: 'Username',
    foto: 'Foto',
    prefixo: 'Prefixo',
    ativo: 'Acesso',
};

const PAPEL_LABELS = { admingeral: 'Admin Geral', admin: 'Administrador', chefe: 'Chefe de Guarnição', BensPatrimoniais: 'Bens Patrimoniais', user: 'Usuário' };
const papel = (r) => (r ? PAPEL_LABELS[r] || r : '');
/** Lista "Campo: de → para" a partir de details.alteracoes (campo/de/para). */
const listarAlteracoes = (alts) => alts.map(a => {
    const de = a.campo === 'role' ? papel(a.de) : formatarValor(a.de);
    const para = a.campo === 'role' ? papel(a.para) : formatarValor(a.para);
    if (a.campo === 'foto') return `Foto ${a.para === 'removida' ? 'removida' : a.de === 'sem foto' ? 'adicionada' : 'trocada'}`;
    return `${labelCampo(a.campo)} ${de} → ${para}`;
}).join('; ');

const IGNORAR_EXTRAS = new Set([
    'material', 'materialId', 'militar', 'militarId', 'quantidade', 'viatura', 'tipo', 'subtipo',
    'recebido_por', 'movimentacaoId', 'alteracoes', 'enviado', 'recebido', 'de', 'para', 'local',
    'local_reparo', 'sei', 'motivo', 'movimentos', 'ajustes', 'locais', 'ignorados', 'materialIds',
]);

const un = (q) => `${q} un.`;
const nome = (v) => (v ? String(v) : null);

export const formatarValor = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'sim' : 'não';
    if (typeof value === 'object') {
        if (typeof value.toDate === 'function') {
            return value.toDate().toLocaleDateString('pt-BR');
        }
        if (Array.isArray(value)) return value.map(formatarValor).join(', ');
        return Object.entries(value).map(([k, v]) => `${k}: ${formatarValor(v)}`).join(' · ');
    }
    return String(value);
};

export const labelCampo = (campo) => CAMPO_LABELS[campo] || campo;

export function descreverLog(log) {
    const d = log?.details || {};
    const alvo = log?.targetName || '';
    const material = nome(d.material) || alvo;
    const out = { frase: '', alvo, envolvido: null, quantidade: d.quantidade ?? null, extras: [] };

    switch (log?.action) {
        case 'material_create':
            out.frase = `Criou o material ${material}${d.categoria ? ` (${d.categoria})` : ''}${d.estoque_total != null ? ` com ${un(d.estoque_total)}` : ''}`;
            break;
        case 'material_update': {
            const alts = Array.isArray(d.alteracoes) ? d.alteracoes : [];
            if (alts.length > 0) {
                out.frase = `Editou ${material}: ` + alts.map(a => `${labelCampo(a.campo)} ${formatarValor(a.de)} → ${formatarValor(a.para)}`).join('; ');
            } else {
                out.frase = `Editou/conferiu o material ${material}`;
            }
            break;
        }
        case 'material_delete':
            out.frase = `Excluiu o material ${material}`;
            break;
        case 'material_allocate':
            out.frase = `Alocou ${d.quantidade != null ? un(d.quantidade) + ' de ' : ''}${material} na viatura ${d.viatura || '—'}`;
            out.envolvido = d.viatura || null;
            break;
        case 'viatura_material_update':
            out.frase = `Alterou a quantidade de ${material} na viatura ${d.viatura || '—'}: ${formatarValor(d.de)} → ${formatarValor(d.para)}`;
            out.envolvido = d.viatura || null;
            break;
        case 'viatura_material_remove':
            out.frase = `Desalocou ${d.quantidade != null ? un(d.quantidade) + ' de ' : ''}${material} da viatura ${d.viatura || '—'}${d.motivo ? ` (${d.motivo})` : ''}`;
            out.envolvido = d.viatura || null;
            break;
        case 'movimentacao_create': {
            const tipo = d.tipo;
            if (tipo === 'cautela') {
                out.frase = `Cautelou ${d.quantidade != null ? un(d.quantidade) + ' de ' : ''}${material} para ${d.militar || 'militar não informado'}`;
                out.envolvido = d.militar || null;
            } else if (tipo === 'entrada') {
                out.frase = `Registrou entrada de ${d.quantidade != null ? un(d.quantidade) + ' de ' : ''}${material}`;
            } else if (tipo === 'saída' || tipo === 'saida') {
                if (d.viatura) {
                    out.frase = `Enviou ${d.quantidade != null ? un(d.quantidade) + ' de ' : ''}${material} para a viatura ${d.viatura}${d.militar ? ` (responsável: ${d.militar})` : ''}`;
                    out.envolvido = d.viatura;
                } else {
                    out.frase = `Registrou saída por consumo de ${d.quantidade != null ? un(d.quantidade) + ' de ' : ''}${material}${d.militar ? ` (responsável: ${d.militar})` : ''}`;
                    out.envolvido = d.militar || null;
                }
            } else if (tipo === 'reparo') {
                out.frase = `Enviou ${d.quantidade != null ? un(d.quantidade) + ' de ' : ''}${material} para reparo${d.local_reparo ? ` em ${d.local_reparo}` : ''}${d.sei ? ` (SEI ${d.sei})` : ''}`;
                out.envolvido = d.local_reparo || null;
            } else if (tipo === 'troca') {
                const env = d.enviado || {};
                const rec = d.recebido || {};
                out.frase = `Troca com a viatura ${d.viatura || '—'}: enviou ${env.quantidade != null ? un(env.quantidade) + ' de ' : ''}${env.material || '—'} e recebeu ${rec.quantidade != null ? un(rec.quantidade) + ' de ' : ''}${rec.material || '—'}${rec.status ? ` (${rec.status})` : ''}${d.militar ? ` — militar: ${d.militar}` : ''}`;
                out.envolvido = d.viatura || d.militar || null;
                out.quantidade = rec.quantidade ?? env.quantidade ?? null;
            } else {
                out.frase = `Registrou movimentação${tipo ? ` (${TIPO_MOV[tipo] || tipo})` : ''} de ${material}`;
                out.envolvido = d.militar || d.viatura || null;
            }
            break;
        }
        case 'devolucao_create': {
            const deReparo = d.tipo === 'reparo';
            out.frase = `${d.militar || 'Militar'} devolveu ${d.quantidade != null ? un(d.quantidade) + ' de ' : ''}${material}${deReparo ? ' (retorno de reparo)' : ''}${d.recebido_por ? `; recebido por ${d.recebido_por}` : ''}`;
            out.envolvido = d.militar || null;
            break;
        }
        case 'reparo_devolucao':
            out.frase = `Marcou como devolvido do reparo: ${material}${d.quantidade != null ? ` (${un(d.quantidade)})` : ''}${d.local_reparo ? ` — vindo de ${d.local_reparo}` : ''}`;
            out.envolvido = d.local_reparo || null;
            break;
        case 'material_local_set':
            if (Array.isArray(d.ajustes)) {
                out.frase = `Ajustou os locais de ${material}: ` + d.ajustes.map(a => `${a.local} ${a.de} → ${a.para}`).join('; ');
            } else {
                out.frase = `${material}: ${d.local || 'local'} ${formatarValor(d.de)} → ${formatarValor(d.para)} un.${d.motivo ? ` (${d.motivo})` : ''}`;
            }
            out.envolvido = d.local || null;
            out.quantidade = d.para ?? null;
            break;
        case 'material_local_move':
            if (Array.isArray(d.movimentos) && d.movimentos.length > 0) {
                out.frase = `${material}: ` + d.movimentos.map(m => `${m.quantidade} un. ${m.de} → ${m.para}`).join('; ') + (d.motivo ? ` (${d.motivo})` : '');
            } else {
                out.frase = `Moveu ${d.quantidade != null ? un(d.quantidade) + ' de ' : ''}${material} de ${d.de || '—'} para ${d.para || '—'}${d.motivo ? ` (${d.motivo})` : ''}`;
            }
            out.envolvido = d.para || null;
            break;
        case 'local_create':
            out.frase = Array.isArray(d.locais) && d.locais.length > 1 ? `Criou ${d.locais.length} locais: ${d.locais.slice(0, 6).join(', ')}${d.locais.length > 6 ? '…' : ''}` : `Criou o local ${alvo}`;
            break;
        case 'local_update':
            out.frase = `Editou o local ${d.de && d.para && d.de !== d.para ? `${d.de} → ${d.para}` : alvo}${d.inoperantes ? ' (local de inoperantes)' : ''}`;
            break;
        case 'local_delete':
            out.frase = `Excluiu o local ${alvo}`;
            break;
        case 'manutencao_create':
            out.frase = `Agendou manutenção${d.tipo ? ` ${d.tipo}` : ''} para ${material}${d.data_prevista ? ` em ${d.data_prevista}` : ''}${d.recorrente && d.recorrente !== 'não' ? ` (recorrente: ${d.recorrente})` : ''}`;
            break;
        case 'manutencao_complete':
            out.frase = `Concluiu manutenção de ${material}${d.o_que_foi_feito ? `: ${d.o_que_foi_feito}` : ''}`;
            break;
        case 'user_create':
            out.frase = `Criou o usuário ${alvo}${d.username ? ` (@${d.username})` : ''}${d.role ? ` como ${papel(d.role)}` : ''}${d.rg ? ` · RG ${d.rg}` : ''}${d.OBM ? ` · ${d.OBM}` : ''}`;
            break;
        case 'user_update': {
            const alts = Array.isArray(d.alteracoes) ? d.alteracoes : [];
            out.frase = alts.length > 0
                ? `Editou o usuário ${alvo}: ${listarAlteracoes(alts)}`
                : `Editou o usuário ${alvo}${d.role ? ` (${papel(d.role)})` : ''} sem alterar dados`;
            break;
        }
        case 'viatura_create':
            out.frase = `Criou a viatura ${alvo}`;
            break;
        case 'viatura_update': {
            const alts = Array.isArray(d.alteracoes) ? d.alteracoes : [];
            out.frase = alts.length > 0 ? `Editou a viatura ${alvo}: ${listarAlteracoes(alts)}` : `Editou a viatura ${alvo}`;
            break;
        }
        case 'viatura_delete':
            out.frase = `Excluiu a viatura ${alvo}`;
            break;
        case 'categoria_create':
            out.frase = `Criou a categoria ${alvo}`;
            break;
        case 'categoria_update': {
            const alts = Array.isArray(d.alteracoes) ? d.alteracoes : [];
            out.frase = alts.length > 0 ? `Editou a categoria: ${listarAlteracoes(alts)}` : `Editou a categoria ${alvo}`;
            break;
        }
        case 'categoria_delete':
            out.frase = `Excluiu a categoria ${alvo}`;
            break;
        case 'user_delete':
            out.frase = `Excluiu o usuário ${alvo}`;
            break;
        case 'user_password_reset':
            out.frase = `Resetou a senha de ${alvo}`;
            break;
        case 'user_deactivate':
            out.frase = `Desativou o acesso de ${alvo}`;
            break;
        case 'user_activate':
            out.frase = `Reativou o acesso de ${alvo}`;
            break;
        case 'perfil_update': {
            const alts = Array.isArray(d.alteracoes) ? d.alteracoes : [];
            out.frase = alts.length > 0
                ? 'Editou o próprio perfil: ' + listarAlteracoes(alts)
                : 'Editou o próprio perfil';
            break;
        }
        case 'perfil_foto_update':
            out.frase = `Trocou a própria foto de perfil${d.primeira ? ' (primeira foto)' : ''}`;
            break;
        case 'perfil_foto_remove':
            out.frase = 'Removeu a própria foto de perfil';
            break;
        case 'perfil_senha_change':
            out.frase = d.forcada ? 'Definiu a nova senha no primeiro acesso' : 'Alterou a própria senha';
            break;
        case 'mensagem_aviso':
            out.frase = `Enviou aviso para ${alvo}${d.texto ? `: "${String(d.texto).slice(0, 120)}"` : ''}`;
            break;
        case 'movimentacao_cobranca':
            out.frase = `Cobrou ${d.tipo === 'devolucao' ? 'a devolução' : 'a assinatura'} de ${alvo} de ${d.militar || '—'} pelo chat`;
            out.envolvido = d.militar || null;
            break;
        case 'amizade_solicitada':
            out.frase = `Pediu amizade a ${alvo}`;
            out.envolvido = alvo || null;
            break;
        case 'amizade_aceita':
            out.frase = `Aceitou o pedido de amizade de ${alvo}`;
            out.envolvido = alvo || null;
            break;
        case 'cautela_transferencia_solicitada':
            out.frase = `Pediu para transferir a cautela de ${alvo}${d.quantidade ? ` (${un(d.quantidade)})` : ''} para ${d.para || '—'}`;
            out.envolvido = d.para || null;
            break;
        case 'cautela_transferida':
            out.frase = `Aceitou e assinou a transferência de ${alvo}${d.quantidade ? ` (${un(d.quantidade)})` : ''} vinda de ${d.de || '—'}`;
            out.envolvido = d.de || null;
            break;
        case 'cautela_transferencia_recusada':
            out.frase = `Recusou a transferência de ${alvo} vinda de ${d.de || '—'}`;
            out.envolvido = d.de || null;
            break;
        case 'tarefa_create':
            out.frase = `Criou a missão "${alvo}"${d.priority ? ` (prioridade ${d.priority})` : ''}`;
            break;
        case 'tarefa_complete':
            out.frase = `Concluiu a missão "${alvo}"`;
            break;
        case 'tarefa_cancel':
            out.frase = `Cancelou a missão "${alvo}"`;
            break;
        default:
            out.frase = `${ACTION_LABELS[log?.action] || log?.action || 'Ação'}${alvo ? `: ${alvo}` : ''}`;
            out.envolvido = d.militar || d.viatura || null;
    }

    for (const [k, v] of Object.entries(d)) {
        if (IGNORAR_EXTRAS.has(k)) continue;
        if (v === null || v === undefined || v === '') continue;
        out.extras.push({ label: labelCampo(k), value: formatarValor(v) });
    }
    return out;
}

/** Texto plano com tudo que pode ser pesquisado num log. */
export function textoBuscaLog(log) {
    const desc = descreverLog(log);
    return [log.userName, log.targetName, ACTION_LABELS[log.action], desc.frase, desc.envolvido, ...desc.extras.map(e => `${e.label} ${e.value}`)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}
