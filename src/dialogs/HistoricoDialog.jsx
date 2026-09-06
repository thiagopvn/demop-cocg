import { useEffect, useMemo, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
    CircularProgress,
    Chip,
    TextField,
    InputAdornment,
    Tooltip,
    alpha,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import {
    Inventory,
    Edit,
    Delete,
    SwapHoriz,
    AssignmentReturn,
    DirectionsCar,
    Build,
    Warehouse,
    Person,
    Timeline as TimelineIcon,
    Warning,
} from '@mui/icons-material';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import db from '../firebase/db';
import { ACTION_LABELS } from '../firebase/auditLog';
import { descreverLog } from '../utils/auditDescriptions';

const CATEGORIAS = {
    cadastro: { label: 'Cadastro e edições', cor: '#2196f3', icon: Edit },
    movimentacao: { label: 'Cautelas e movimentações', cor: '#ff9800', icon: SwapHoriz },
    viatura: { label: 'Viaturas', cor: '#00bcd4', icon: DirectionsCar },
    manutencao: { label: 'Manutenções', cor: '#9c27b0', icon: Build },
    local: { label: 'Locais no DEMOP', cor: '#0d9488', icon: Warehouse },
    outro: { label: 'Outros', cor: '#607d8b', icon: TimelineIcon },
};

const TIPO_MOV_LABEL = { cautela: 'Cautela', entrada: 'Entrada', 'saída': 'Saída', reparo: 'Envio para reparo', troca: 'Troca com viatura' };
const STATUS_MOV_LABEL = {
    cautelado: 'em aberto', devolvido: 'devolvido', emEstoque: 'em estoque', descartado: 'concluída',
    emReparo: 'em reparo', devolvidaDeReparo: 'devolvido do reparo',
};

const toDate = (v) => {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate();
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

const categoriaDaAcao = (action = '') => {
    if (action.startsWith('material_local') || action.startsWith('local_')) return 'local';
    if (action.startsWith('manutencao')) return 'manutencao';
    if (action.startsWith('viatura_material') || action === 'material_allocate') return 'viatura';
    if (action === 'movimentacao_create' || action === 'devolucao_create' || action === 'reparo_devolucao') return 'movimentacao';
    if (action.startsWith('material_') || action.startsWith('user_') || action.startsWith('categoria_')) return 'cadastro';
    return 'outro';
};

const iconeDaAcao = (action = '') => {
    if (action.endsWith('_delete')) return Delete;
    if (action.endsWith('_create')) return Inventory;
    if (action.startsWith('user_')) return Person;
    return null;
};

/** Converte um audit_log num evento da linha do tempo. */
const eventoDeLog = (log) => {
    const desc = descreverLog(log);
    const categoria = categoriaDaAcao(log.action);
    return {
        id: `log-${log.id}`,
        data: toDate(log.timestamp),
        categoria,
        icon: iconeDaAcao(log.action) || CATEGORIAS[categoria].icon,
        titulo: ACTION_LABELS[log.action] || log.action,
        descricao: desc.frase,
        autor: log.userName || null,
        extras: desc.extras,
        origem: 'auditoria',
    };
};

/**
 * Monta os eventos retroativos de um material a partir das colecoes operacionais
 * (movimentacoes, viatura_materiais, manutencoes, historico_manutencoes) — cobre
 * tudo que aconteceu antes de existir auditoria detalhada.
 */
async function carregarEventosDoMaterial(materialId, logs) {
    const eventos = [];
    const recebimentos = new Map(); // movimentacaoId -> quem recebeu a devolucao (auditoria nova)
    for (const l of logs) {
        if (l.action === 'devolucao_create' && l.details?.movimentacaoId) {
            recebimentos.set(l.details.movimentacaoId, l.userName);
        }
    }

    const [movSnap, vmSnap, histSnap, manSnap, matSnap] = await Promise.all([
        getDocs(query(collection(db, 'movimentacoes'), where('material', '==', materialId))),
        getDocs(query(collection(db, 'viatura_materiais'), where('material_id', '==', materialId))),
        getDocs(query(collection(db, 'historico_manutencoes'), where('materialId', '==', materialId))),
        getDocs(query(collection(db, 'manutencoes'), where('materialId', '==', materialId))),
        getDoc(doc(db, 'materials', materialId)),
    ]);

    // Cadastro (quando nao ha log de criacao)
    if (matSnap.exists() && !logs.some(l => l.action === 'material_create')) {
        const m = matSnap.data();
        const data = toDate(m.created_at);
        if (data) {
            eventos.push({
                id: 'mat-created',
                data,
                categoria: 'cadastro',
                icon: Inventory,
                titulo: 'Material cadastrado',
                descricao: `${m.description}${m.categoria ? ` (${m.categoria})` : ''} — estoque inicial registrado: ${m.estoque_total ?? '—'} un.`,
                autor: m.created_by_nome || null,
                extras: [],
                origem: 'material',
            });
        }
    }

    // Movimentacoes: criacao + devolucao
    movSnap.docs.forEach(d => {
        const mv = d.data();
        const qtd = mv.quantity != null ? `${mv.quantity} un.` : '';
        const tipo = mv.type;
        const data = toDate(mv.date);
        let descricao;
        let icon = SwapHoriz;
        if (tipo === 'cautela') {
            descricao = `${qtd} cautelada(s) para ${mv.user_name || 'militar não informado'}${mv.user_rg ? ` (RG ${mv.user_rg})` : ''} — situação: ${STATUS_MOV_LABEL[mv.status] || mv.status || '—'}`;
        } else if (tipo === 'entrada') {
            descricao = `Entrada de ${qtd} no estoque`;
        } else if (tipo === 'saída') {
            descricao = mv.subtype === 'viatura'
                ? `${qtd} enviada(s) para a viatura ${mv.viatura_description || '—'}${mv.user_name ? ` (responsável: ${mv.user_name})` : ''}`
                : `Saída por consumo de ${qtd}${mv.user_name ? ` (responsável: ${mv.user_name})` : ''}`;
        } else if (tipo === 'reparo') {
            icon = Warning;
            descricao = `${qtd} enviada(s) para reparo${mv.repairLocation ? ` em ${mv.repairLocation}` : ''}${mv.seiNumber ? ` (SEI ${mv.seiNumber})` : ''}${mv.motivoReparo ? ` — motivo: ${mv.motivoReparo}` : ''} — situação: ${STATUS_MOV_LABEL[mv.status] || mv.status || '—'}`;
        } else if (tipo === 'troca') {
            descricao = `Troca com a viatura ${mv.viatura_description || '—'}${mv.user_name ? ` — militar: ${mv.user_name}` : ''}`;
        } else {
            descricao = `${TIPO_MOV_LABEL[tipo] || tipo || 'Movimentação'} de ${qtd}`;
        }
        if (mv.observacoes) descricao += ` · Obs.: ${mv.observacoes}`;
        if (mv.transferred_at) descricao += ` · Transferida de ${TIPO_MOV_LABEL[mv.original_type] || mv.original_type} para ${TIPO_MOV_LABEL[tipo] || tipo} por ${mv.transferred_by_name || '—'}`;

        eventos.push({
            id: `mov-${d.id}`,
            data,
            categoria: 'movimentacao',
            icon,
            titulo: TIPO_MOV_LABEL[tipo] || 'Movimentação',
            descricao,
            autor: mv.sender_name || null,
            extras: [],
            origem: 'movimentacoes',
        });

        const devolvida = toDate(mv.returned_date);
        if (devolvida) {
            const recebidoPor = recebimentos.get(d.id);
            eventos.push({
                id: `dev-${d.id}`,
                data: devolvida,
                categoria: 'movimentacao',
                icon: AssignmentReturn,
                titulo: mv.status === 'devolvidaDeReparo' ? 'Retorno de reparo' : 'Devolução',
                descricao: `${mv.user_name || 'Militar'} devolveu ${qtd}${mv.status === 'devolvidaDeReparo' ? ' (retorno de reparo)' : ''}${recebidoPor ? `; recebido por ${recebidoPor}` : ''}${mv.signed ? ' · assinatura confirmada' : ''}`,
                autor: recebidoPor || null,
                extras: [],
                origem: 'movimentacoes',
            });
        }
    });

    // Viaturas: alocacao e desalocacao
    vmSnap.docs.forEach(d => {
        const vm = d.data();
        const viatura = vm.viatura_prefixo ? `${vm.viatura_prefixo} - ${vm.viatura_description || ''}` : (vm.viatura_description || '—');
        const alocada = toDate(vm.data_alocacao);
        if (alocada) {
            eventos.push({
                id: `vm-${d.id}`,
                data: alocada,
                categoria: 'viatura',
                icon: DirectionsCar,
                titulo: 'Alocado em viatura',
                descricao: `${vm.quantidade ?? '—'} un. alocada(s) na viatura ${viatura}${vm.origem ? ` (origem: ${vm.origem})` : ''}`,
                autor: vm.alocado_por_nome || null,
                extras: [],
                origem: 'viatura_materiais',
            });
        }
        const desalocada = toDate(vm.data_desalocacao || vm.desalocado_em);
        if (vm.status === 'desalocado' && desalocada) {
            eventos.push({
                id: `vmd-${d.id}`,
                data: desalocada,
                categoria: 'viatura',
                icon: DirectionsCar,
                titulo: 'Desalocado de viatura',
                descricao: `Saiu da viatura ${viatura}${vm.motivo_desalocacao ? ` — ${vm.motivo_desalocacao}` : ''}`,
                autor: vm.desalocado_por_nome || null,
                extras: [],
                origem: 'viatura_materiais',
            });
        }
    });

    // Manutencoes agendadas
    manSnap.docs.forEach(d => {
        const m = d.data();
        const data = toDate(m.createdAt);
        if (!data) return;
        const prevista = toDate(m.dueDate);
        eventos.push({
            id: `man-${d.id}`,
            data,
            categoria: 'manutencao',
            icon: Build,
            titulo: 'Manutenção agendada',
            descricao: `${m.type || 'Manutenção'}${prevista ? ` prevista para ${prevista.toLocaleDateString('pt-BR')}` : ''}${m.isRecurrent ? ` · recorrente (${m.recurrenceType || ''})` : ''} · status: ${m.status || '—'}${m.inoperantQuantity ? ` · ${m.inoperantQuantity} un. inoperante(s)` : ''}${m.description ? ` — ${m.description}` : ''}`,
            autor: m.createdBy || null,
            extras: [],
            origem: 'manutencoes',
        });
    });

    // Manutencoes concluidas
    histSnap.docs.forEach(d => {
        const h = d.data();
        const data = toDate(h.completedAt);
        if (!data) return;
        eventos.push({
            id: `hist-${d.id}`,
            data,
            categoria: 'manutencao',
            icon: Build,
            titulo: 'Manutenção concluída',
            descricao: `${h.type || 'Manutenção'}${h.completionNotes ? ` — ${h.completionNotes}` : ''}`,
            autor: h.completedBy || null,
            extras: [],
            origem: 'historico_manutencoes',
        });
    });

    return eventos;
}

/** Logs de auditoria cujo conteudo ja vem, com mais dados, das colecoes operacionais. */
const LOGS_COBERTOS_POR_DOCUMENTOS = new Set(['movimentacao_create', 'devolucao_create', 'material_allocate', 'viatura_material_remove']);

const fmtHora = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDia = (d) => d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
const chaveDia = (d) => d.toISOString().slice(0, 10);

/**
 * Historico completo de um item. Para `tipo="material"` junta a auditoria com os
 * registros operacionais (movimentacoes, viaturas, manutencoes), o que da o retroativo.
 */
export default function HistoricoDialog({ open, onClose, targetId, targetName, tipo = 'generico' }) {
    const theme = useTheme();
    const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [erro, setErro] = useState(null);
    const [filtro, setFiltro] = useState('todos');
    const [busca, setBusca] = useState('');

    useEffect(() => {
        if (!open || !targetId) return undefined;
        let cancelled = false;
        setLoading(true);
        setErro(null);
        setEventos([]);
        setFiltro('todos');
        setBusca('');

        (async () => {
            try {
                let logs = [];
                try {
                    const snap = await getDocs(query(collection(db, 'audit_logs'), where('targetId', '==', targetId), orderBy('timestamp', 'desc')));
                    logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                } catch (e) {
                    console.error('Erro ao buscar auditoria:', e);
                    if (tipo !== 'material') throw e;
                    setErro('A auditoria não pôde ser carregada (verifique permissão e índice). Mostrando apenas os registros operacionais.');
                }

                let lista = logs
                    .filter(l => !(tipo === 'material' && LOGS_COBERTOS_POR_DOCUMENTOS.has(l.action)))
                    .map(eventoDeLog);

                if (tipo === 'material') {
                    const retro = await carregarEventosDoMaterial(targetId, logs);
                    lista = lista.concat(retro);
                }

                lista = lista.filter(e => e.data).sort((a, b) => b.data - a.data);
                if (!cancelled) setEventos(lista);
            } catch (e) {
                console.error('Erro ao montar histórico:', e);
                if (!cancelled) setErro(e?.code === 'permission-denied' ? 'Sem permissão para ver o histórico (apenas admin geral).' : 'Não foi possível carregar o histórico.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [open, targetId, tipo]);

    const contagens = useMemo(() => {
        const c = {};
        for (const e of eventos) c[e.categoria] = (c[e.categoria] || 0) + 1;
        return c;
    }, [eventos]);

    const visiveis = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return eventos.filter(e => {
            if (filtro !== 'todos' && e.categoria !== filtro) return false;
            if (!termo) return true;
            return [e.titulo, e.descricao, e.autor, ...e.extras.map(x => `${x.label} ${x.value}`)].filter(Boolean).join(' ').toLowerCase().includes(termo);
        });
    }, [eventos, filtro, busca]);

    const grupos = useMemo(() => {
        const mapa = new Map();
        for (const e of visiveis) {
            const k = chaveDia(e.data);
            if (!mapa.has(k)) mapa.set(k, { dia: e.data, itens: [] });
            mapa.get(k).itens.push(e);
        }
        return [...mapa.values()];
    }, [visiveis]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            fullScreen={fullScreenDialog}
            PaperProps={{ sx: { borderRadius: fullScreenDialog ? 0 : 3, overflow: 'hidden', maxHeight: fullScreenDialog ? '100%' : '90vh' } }}
        >
            <DialogTitle sx={{ background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: 'white', py: 2, pr: 7 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha('#fff', 0.15), display: 'flex' }}><HistoryIcon /></Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Histórico completo</Typography>
                        {targetName && <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>{targetName}</Typography>}
                    </Box>
                </Box>
                <IconButton aria-label="fechar" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12, color: 'white', bgcolor: alpha('#fff', 0.1), '&:hover': { bgcolor: alpha('#fff', 0.2) } }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Buscar por militar, viatura, quantidade, observação..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
                    sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    <Chip label={`Tudo (${eventos.length})`} size="small" onClick={() => setFiltro('todos')} color={filtro === 'todos' ? 'primary' : 'default'} variant={filtro === 'todos' ? 'filled' : 'outlined'} sx={{ fontWeight: 600 }} />
                    {Object.entries(CATEGORIAS).filter(([k]) => contagens[k]).map(([k, c]) => {
                        const Icon = c.icon;
                        const ativo = filtro === k;
                        return (
                            <Chip
                                key={k}
                                icon={<Icon sx={{ fontSize: '1rem !important', color: `${ativo ? '#fff' : c.cor} !important` }} />}
                                label={`${c.label} (${contagens[k]})`}
                                size="small"
                                onClick={() => setFiltro(ativo ? 'todos' : k)}
                                sx={{ fontWeight: 600, bgcolor: ativo ? c.cor : alpha(c.cor, 0.1), color: ativo ? '#fff' : c.cor, border: `1px solid ${alpha(c.cor, 0.35)}`, '&:hover': { bgcolor: ativo ? c.cor : alpha(c.cor, 0.2) } }}
                            />
                        );
                    })}
                </Box>
            </Box>

            <DialogContent sx={{ p: { xs: 1.5, sm: 3 }, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6, gap: 2 }}>
                        <CircularProgress size={28} />
                        <Typography variant="body2" color="text.secondary">Reunindo auditoria, movimentações, viaturas e manutenções...</Typography>
                    </Box>
                )}

                {erro && !loading && (
                    <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.warning.main, 0.1), border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}` }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.dark' }}>{erro}</Typography>
                    </Box>
                )}

                {!loading && visiveis.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <HistoryIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {eventos.length === 0 ? 'Nenhum registro encontrado' : 'Nada corresponde ao filtro'}
                        </Typography>
                    </Box>
                )}

                {!loading && grupos.map((grupo) => (
                    <Box key={chaveDia(grupo.dia)} sx={{ mb: 2.5 }}>
                        <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.08em', display: 'block', mb: 1, textTransform: 'capitalize' }}>
                            {fmtDia(grupo.dia)}
                        </Typography>
                        <Box sx={{ position: 'relative', pl: { xs: 4.5, sm: 5.5 }, '&::before': { content: '""', position: 'absolute', left: { xs: 15, sm: 19 }, top: 6, bottom: 6, width: 2, bgcolor: alpha(theme.palette.text.primary, 0.08), borderRadius: 1 } }}>
                            {grupo.itens.map((e) => {
                                const cat = CATEGORIAS[e.categoria] || CATEGORIAS.outro;
                                const Icon = e.icon || cat.icon;
                                return (
                                    <Box key={e.id} sx={{ position: 'relative', mb: 1.25 }}>
                                        <Box sx={{ position: 'absolute', left: { xs: -36, sm: -44 }, top: 10, width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 }, borderRadius: '50%', bgcolor: cat.cor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 10px ${alpha(cat.cor, 0.35)}`, border: `3px solid ${theme.palette.background.paper}` }}>
                                            <Icon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                                        </Box>
                                        <Box sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, bgcolor: 'background.paper', border: `1px solid ${alpha(cat.cor, 0.25)}`, borderLeft: `4px solid ${cat.cor}`, transition: 'box-shadow 0.2s', '&:hover': { boxShadow: `0 6px 18px ${alpha(cat.cor, 0.15)}` } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap' }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: cat.cor, flex: 1, minWidth: 140, lineHeight: 1.3 }}>{e.titulo}</Typography>
                                                <Chip label={fmtHora(e.data)} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.72rem', bgcolor: alpha(cat.cor, 0.1), color: cat.cor }} />
                                            </Box>
                                            <Typography variant="body2" sx={{ mt: 0.5, lineHeight: 1.5, wordBreak: 'break-word' }}>{e.descricao}</Typography>
                                            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mt: 1 }}>
                                                <Tooltip title="Quem executou a ação">
                                                    <Chip icon={<Person sx={{ fontSize: '0.95rem !important' }} />} label={e.autor || 'Sistema / não registrado'} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.72rem', fontWeight: 600 }} />
                                                </Tooltip>
                                                {e.extras.map((x) => (
                                                    <Chip key={x.label} label={`${x.label}: ${x.value}`} size="small" sx={{ height: 22, fontSize: '0.7rem', maxWidth: 320 }} />
                                                ))}
                                                <Typography variant="caption" color="text.disabled" sx={{ ml: 'auto' }}>{e.origem}</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                ))}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                    {visiveis.length} registro{visiveis.length === 1 ? '' : 's'} · visível apenas para o admin geral
                </Typography>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Fechar</Button>
            </DialogActions>
        </Dialog>
    );
}
