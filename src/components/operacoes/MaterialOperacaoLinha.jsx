import { memo } from 'react';
import { Avatar, Box, Button, Chip, IconButton, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import {
    Inventory2Outlined,
    LocalShippingOutlined,
    OpenInNew,
    EditOutlined,
    DeleteOutline,
    LinkOutlined,
    WarningAmberRounded,
    ErrorOutlineRounded,
    CheckCircleOutlineRounded,
    ChecklistRtlRounded,
    LinkOffRounded,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import LocalChip from '../locais/LocalChip';
import { alocacaoComoLocal, ordenarLocais } from '../../services/localizacaoService';
import { avaliarItem, NIVEL_ITEM } from '../../services/operacoesService';

const fmtQtd = (n) => String(n).padStart(2, '0');

/** Frase curta e discreta sobre a falta de material disponível para retirada imediata. */
const fraseAviso = (s) => {
    const partes = [];
    if (s.nivel === 'zerado') partes.push(`Nenhuma unidade disponível para retirada imediata · a nota prevê ${fmtQtd(s.previsto)}`);
    else partes.push(`Só ${s.disponivel} disponível(is) para retirada imediata · a nota prevê ${fmtQtd(s.previsto)}`);
    if (s.emViatura > 0) partes.push(`${s.emViatura} em viatura`);
    if (s.inoperantes > 0) partes.push(`${s.inoperantes} inoperante(s)`);
    partes.push(`${s.total} no total`);
    return partes.join(' · ');
};

/**
 * Uma linha de material previsto na nota. A quantidade é a fixada pela nota;
 * o que muda em tempo real é o material vinculado (nome/foto do cadastro), o local
 * de guarda no DEMOP (material_locais), as unidades em viatura e o aviso de estoque.
 */
function MaterialOperacaoLinha({
    item,
    material,
    alocacoes = [],
    emViatura = [],
    sugestao = null,
    podeEditar = false,
    destacado = false,
    onEditar,
    onExcluir,
    onVincular,
}) {
    const theme = useTheme();
    const navigate = useNavigate();
    const situacao = avaliarItem(item, material);
    const nivel = NIVEL_ITEM[situacao.nivel];
    const locais = [...alocacoes].sort((a, b) => ordenarLocais(alocacaoComoLocal(a), alocacaoComoLocal(b)));
    const temQtd = item.quantidade !== null && item.quantidade !== undefined;
    const nomeDifere = material && material.description && material.description.trim().toLowerCase() !== (item.nome || '').trim().toLowerCase();
    const alerta = situacao.nivel === 'parcial' || situacao.nivel === 'zerado';
    const corAlerta = situacao.nivel === 'zerado' ? theme.palette.error.main : theme.palette.warning.main;

    const IconeSituacao = situacao.nivel === 'ok' ? CheckCircleOutlineRounded
        : situacao.nivel === 'zerado' ? ErrorOutlineRounded
            : situacao.nivel === 'parcial' ? WarningAmberRounded
                : situacao.nivel === 'checklist' ? ChecklistRtlRounded
                    : LinkOffRounded;

    return (
        <Box
            sx={{
                display: 'flex',
                gap: { xs: 1.25, sm: 1.75 },
                p: { xs: 1.25, sm: 1.5 },
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: destacado ? alpha(theme.palette.secondary.main, 0.6) : alpha(theme.palette.divider, 1),
                bgcolor: destacado ? alpha(theme.palette.secondary.main, 0.06) : 'background.paper',
                transition: 'border-color .2s, background-color .2s, transform .15s',
                '&:hover': { borderColor: alpha(nivel.cor, 0.5), transform: { sm: 'translateY(-1px)' } },
            }}
        >
            {/* Foto / ícone do material */}
            <Avatar
                variant="rounded"
                src={material?.image_url || undefined}
                alt=""
                sx={{ width: { xs: 44, sm: 52 }, height: { xs: 44, sm: 52 }, borderRadius: 2, bgcolor: alpha(nivel.cor, 0.12), color: nivel.cor, flexShrink: 0 }}
            >
                <Inventory2Outlined />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Nome + quantidade */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.25, wordBreak: 'break-word' }}>
                            {item.nome}
                        </Typography>
                        {material ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, minWidth: 0 }}>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                                    {nomeDifere ? `No estoque: ${material.description}` : 'Vinculado ao estoque'}
                                    {material.categoria ? ` · ${material.categoria}` : ''}
                                </Typography>
                                <Tooltip title="Abrir no cadastro de materiais">
                                    <IconButton size="small" onClick={() => navigate('/material')} sx={{ p: 0.25 }} aria-label="Abrir material">
                                        <OpenInNew sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.25 }}>
                                {item.unidade ? `${item.unidade} · ` : ''}sem vínculo com o estoque do DEMOP
                            </Typography>
                        )}
                        {material && item.unidade && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{item.unidade}</Typography>
                        )}
                    </Box>

                    <Tooltip title={temQtd ? 'Quantidade fixada pela nota' : 'Item de checklist — a nota não fixa quantidade'} arrow>
                        <Box
                            sx={{
                                px: 1.1,
                                py: 0.35,
                                borderRadius: 1.5,
                                minWidth: 46,
                                textAlign: 'center',
                                bgcolor: temQtd ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.info.main, 0.1),
                                color: temQtd ? 'primary.main' : 'info.main',
                                fontWeight: 900,
                                fontSize: temQtd ? '0.95rem' : '0.62rem',
                                letterSpacing: temQtd ? 0 : 0.4,
                                lineHeight: 1.3,
                                flexShrink: 0,
                                textTransform: temQtd ? 'none' : 'uppercase',
                            }}
                        >
                            {temQtd ? `×${fmtQtd(item.quantidade)}` : 'lista'}
                        </Box>
                    </Tooltip>
                </Box>

                {/* Onde está no DEMOP */}
                {material && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap', mt: 0.9 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', mr: 0.25 }}>Onde está:</Typography>
                        {locais.length === 0 && emViatura.length === 0 && (
                            <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>sem local definido no DEMOP</Typography>
                        )}
                        {locais.map((a) => (
                            <LocalChip key={a.id} local={alocacaoComoLocal(a)} quantidade={a.quantidade} onClick={() => navigate('/locais')} sx={{ height: 24, fontSize: '0.72rem' }} />
                        ))}
                        {emViatura.map((v) => (
                            <Tooltip key={v.id} title={`${v.viatura_prefixo || 'Viatura'}${v.viatura_description ? ` — ${v.viatura_description}` : ''} · ${v.quantidade} unidade(s) embarcada(s)`} arrow>
                                <Chip
                                    size="small"
                                    icon={<LocalShippingOutlined sx={{ fontSize: '0.95rem !important' }} />}
                                    label={`${v.viatura_prefixo || 'Viatura'} ×${v.quantidade}`}
                                    onClick={v.viatura_id ? () => navigate(`/viatura/${v.viatura_id}`) : undefined}
                                    sx={{ height: 24, fontSize: '0.72rem', fontWeight: 600, bgcolor: alpha('#0891b2', 0.1), color: theme.palette.mode === 'dark' ? '#67e8f9' : '#0e7490', border: `1px solid ${alpha('#0891b2', 0.3)}`, '& .MuiChip-icon': { color: 'inherit' }, '& .MuiChip-label': { px: 0.9 } }}
                                />
                            </Tooltip>
                        ))}
                    </Box>
                )}

                {/* Situação do estoque */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.75, flexWrap: 'wrap' }}>
                    {alerta ? (
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: corAlerta, fontWeight: 600, lineHeight: 1.3 }}>
                            <IconeSituacao sx={{ fontSize: 15 }} />
                            {fraseAviso(situacao)}
                        </Typography>
                    ) : situacao.nivel === 'ok' ? (
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'success.main', fontWeight: 600 }}>
                            <IconeSituacao sx={{ fontSize: 15 }} />
                            {situacao.disponivel} disponível(is) para retirada imediata{situacao.emViatura > 0 ? ` · ${situacao.emViatura} em viatura` : ''}
                        </Typography>
                    ) : situacao.nivel === 'checklist' ? (
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'info.main', fontWeight: 600 }}>
                            <IconeSituacao sx={{ fontSize: 15 }} />
                            {situacao.disponivel} disponível(is) no DEMOP{situacao.emViatura > 0 ? ` · ${situacao.emViatura} em viatura` : ''}
                        </Typography>
                    ) : sugestao ? (
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                            <LinkOutlined sx={{ fontSize: 15 }} />
                            Parece ser <strong>&nbsp;{sugestao.material.description}</strong>
                            {podeEditar && onVincular && (
                                <Button size="small" onClick={() => onVincular(item, sugestao.material)} sx={{ ml: 0.5, py: 0, px: 0.75, minWidth: 0, textTransform: 'none', fontWeight: 700, fontSize: '0.72rem' }}>
                                    Vincular
                                </Button>
                            )}
                        </Typography>
                    ) : podeEditar && onVincular ? (
                        <Button size="small" startIcon={<LinkOutlined sx={{ fontSize: '15px !important' }} />} onClick={() => onVincular(item, null)} sx={{ py: 0, px: 0.75, minWidth: 0, textTransform: 'none', fontWeight: 700, fontSize: '0.72rem', color: 'text.secondary' }}>
                            Vincular a um material do estoque
                        </Button>
                    ) : null}
                    {item.observacao && (
                        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', fontStyle: 'italic' }}>
                            {item.observacao}
                        </Typography>
                    )}
                </Box>
            </Box>

            {/* Ações do admingeral */}
            {podeEditar && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, flexShrink: 0 }}>
                    <Tooltip title="Editar item">
                        <IconButton size="small" onClick={() => onEditar?.(item)} aria-label="Editar item"><EditOutlined sx={{ fontSize: 18 }} /></IconButton>
                    </Tooltip>
                    <Tooltip title="Remover item">
                        <IconButton size="small" color="error" onClick={() => onExcluir?.(item)} aria-label="Remover item"><DeleteOutline sx={{ fontSize: 18 }} /></IconButton>
                    </Tooltip>
                </Box>
            )}
        </Box>
    );
}

export default memo(MaterialOperacaoLinha);
