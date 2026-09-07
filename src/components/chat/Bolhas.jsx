import { Box, Typography, Button, Chip, alpha, useTheme, CircularProgress } from '@mui/material';
import { Draw, AssignmentReturn, SwapHoriz, Campaign, CheckCircle, Cancel, Info } from '@mui/icons-material';

export const fmtHora = (ts) => {
    const d = ts?.toDate?.() || (ts ? new Date(ts) : null);
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
export const fmtDia = (ts) => {
    const d = ts?.toDate?.() || (ts ? new Date(ts) : null);
    if (!d || Number.isNaN(d.getTime())) return '';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const dia = new Date(d); dia.setHours(0, 0, 0, 0);
    const diff = Math.round((hoje - dia) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: diff > 300 ? 'numeric' : undefined });
};
export const fmtDataHora = (ts) => { const d = ts?.toDate?.() || (ts ? new Date(ts) : null); return d && !Number.isNaN(d.getTime()) ? `${d.toLocaleDateString('pt-BR')} ${fmtHora(d)}` : ''; };

const STATUS_TRANSF = { pendente: ['Aguardando resposta', 'warning'], aceita: ['Aceita e assinada', 'success'], recusada: ['Recusada', 'error'], cancelada: ['Cancelada', 'default'] };

/** Card de cautela dentro do chat: cobrança (assinatura/devolução) ou transferência. */
export function CardCautela({ msg, euId, ocupado, onAssinar, onResponderTransferencia, onCancelarTransferencia, onIrParaPendencias }) {
    const theme = useTheme();
    const c = msg.card || {};
    const souDestinatario = msg.para === euId;
    const ehTransf = msg.tipo === 'transferencia';
    const ehDevolucao = c.subtipo === 'devolucao';
    const cor = ehTransf ? theme.palette.warning.main : ehDevolucao ? theme.palette.info.main : theme.palette.secondary.main;
    const Icone = ehTransf ? SwapHoriz : ehDevolucao ? AssignmentReturn : Draw;
    const titulo = ehTransf ? 'Transferência de cautela' : ehDevolucao ? 'Cobrança de devolução' : 'Cobrança de assinatura';
    const dataCautela = c.data ? new Date(c.data).toLocaleDateString('pt-BR') : null;
    const [statusTxt, statusCor] = ehTransf ? (STATUS_TRANSF[c.status] || STATUS_TRANSF.pendente) : c.signed ? ['Assinada', 'success'] : c.status && c.status !== 'cautelado' ? ['Encerrada', 'default'] : ['Pendente', 'warning'];

    return (
        <Box sx={{ mt: 1, borderRadius: 2.5, overflow: 'hidden', border: `1px solid ${alpha(cor, 0.4)}`, bgcolor: alpha(cor, theme.palette.mode === 'dark' ? 0.12 : 0.06) }}>
            <Box sx={{ px: 1.5, py: 0.9, display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha(cor, 0.16) }}>
                <Icone sx={{ fontSize: 18, color: cor }} />
                <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: '0.02em', flex: 1, color: 'text.primary' }}>{titulo}</Typography>
                <Chip size="small" label={statusTxt} color={statusCor === 'default' ? undefined : statusCor} variant={statusCor === 'default' ? 'outlined' : 'filled'} sx={{ height: 20, fontSize: '0.66rem', fontWeight: 700 }} />
            </Box>
            <Box sx={{ px: 1.5, py: 1.2 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.25 }}>{c.material_description || 'Material'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {c.quantidade ? `${c.quantidade} un.` : ''}{dataCautela ? ` · cautelada em ${dataCautela}` : ''}
                    {ehTransf ? ` · de ${c.de_nome || '—'} para ${c.para_nome || '—'}` : ''}
                </Typography>

                {/* Ações de quem recebe */}
                {!ehTransf && souDestinatario && !c.signed && !ehDevolucao && c.status === 'cautelado' && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                        <Button size="small" variant="contained" color="secondary" startIcon={ocupado ? <CircularProgress size={14} color="inherit" /> : <Draw />} disabled={ocupado} onClick={() => onAssinar?.(msg)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}>Assinar agora</Button>
                        <Button size="small" variant="text" onClick={onIrParaPendencias} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Ver pendências</Button>
                    </Box>
                )}
                {!ehTransf && souDestinatario && ehDevolucao && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}><Info sx={{ fontSize: 14, verticalAlign: 'text-bottom' }} /> Devolva o material no DEMOP para encerrar a cautela.</Typography>
                )}
                {ehTransf && c.status === 'pendente' && souDestinatario && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                        <Button size="small" variant="contained" color="success" startIcon={ocupado ? <CircularProgress size={14} color="inherit" /> : <CheckCircle />} disabled={ocupado} onClick={() => onResponderTransferencia?.(msg, true)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}>Aceitar e assinar (senha)</Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<Cancel />} disabled={ocupado} onClick={() => onResponderTransferencia?.(msg, false)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Recusar</Button>
                    </Box>
                )}
                {ehTransf && c.status === 'pendente' && !souDestinatario && (
                    <Button size="small" variant="text" color="inherit" disabled={ocupado} onClick={() => onCancelarTransferencia?.(msg)} sx={{ mt: 1, borderRadius: 2, textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancelar transferência</Button>
                )}
                {ehTransf && c.status === 'aceita' && c.novaMovimentacaoId && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'success.main', fontWeight: 700 }}>Nova cautela registrada no nome de {c.para_nome}. A original foi encerrada como transferida.</Typography>
                )}
            </Box>
        </Box>
    );
}

/** Uma mensagem no chat. */
export function Bolha({ msg, euId, mostrarNome, ...acoes }) {
    const theme = useTheme();
    const minha = msg.de === euId;
    const sistema = msg.tipo === 'sistema';
    const aviso = msg.tipo === 'aviso';
    if (sistema) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                <Typography variant="caption" sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: alpha(theme.palette.text.primary, 0.06), color: 'text.secondary', textAlign: 'center', maxWidth: '85%' }}>{msg.texto}</Typography>
            </Box>
        );
    }
    const bg = minha ? theme.palette.primary.main : (theme.palette.mode === 'dark' ? alpha('#ffffff', 0.08) : '#ffffff');
    const fg = minha ? '#fff' : theme.palette.text.primary;
    return (
        <Box sx={{ display: 'flex', justifyContent: minha ? 'flex-end' : 'flex-start', my: 0.5 }}>
            <Box sx={{ maxWidth: { xs: '88%', sm: '72%' }, minWidth: 90, px: 1.5, py: 1, borderRadius: 3, borderTopRightRadius: minha ? 6 : 12, borderTopLeftRadius: minha ? 12 : 6, bgcolor: bg, color: fg, boxShadow: minha ? 'none' : `0 1px 2px ${alpha('#000', 0.08)}`, border: minha ? 'none' : `1px solid ${alpha(theme.palette.divider, 1)}` }}>
                {mostrarNome && !minha && <Typography variant="caption" sx={{ fontWeight: 800, color: minha ? alpha('#fff', 0.85) : 'secondary.main', display: 'block', mb: 0.25 }}>{msg.de_nome}</Typography>}
                {aviso && <Chip icon={<Campaign sx={{ fontSize: 14 }} />} label="Aviso para todos" size="small" sx={{ mb: 0.5, height: 20, fontSize: '0.66rem', fontWeight: 700, bgcolor: alpha(minha ? '#fff' : theme.palette.info.main, 0.18), color: minha ? '#fff' : 'info.main' }} />}
                {msg.texto && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.45 }}>{msg.texto}</Typography>}
                {(msg.tipo === 'cobranca' || msg.tipo === 'transferencia') && <Box sx={{ color: 'text.primary' }}><CardCautela msg={msg} euId={euId} {...acoes} /></Box>}
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.4, fontSize: '0.66rem', color: minha ? alpha('#fff', 0.75) : 'text.disabled' }}>
                    {fmtHora(msg.criada_em)}{minha && msg.lida ? ' · lida' : ''}
                </Typography>
            </Box>
        </Box>
    );
}
