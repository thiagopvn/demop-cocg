import { useMemo } from 'react';
import { Box, Button, Chip, Divider, IconButton, Paper, Tooltip, Typography, alpha, lighten, useTheme } from '@mui/material';
import {
    Add,
    ArrowBackRounded,
    ArticleOutlined,
    ContentCutOutlined,
    DeleteOutline,
    EditOutlined,
    EventOutlined,
    InsertLinkOutlined,
    MenuBookOutlined,
    NotesOutlined,
    OpenInNew,
    PlaylistAddOutlined,
} from '@mui/icons-material';
import OperacaoIcone from '../../components/operacoes/OperacaoIcone';
import MaterialOperacaoLinha from '../../components/operacoes/MaterialOperacaoLinha';
import { NPEPI_REFERENCIA } from '../../data/operacoesCbmerj';
import { combinaBusca, resumirOperacao, sugerirMaterial } from '../../services/operacoesService';
import { normalizeName } from '../../utils/materialSimilarity';

const IconeLink = ({ tipo }) => (tipo === 'recorte' ? <ContentCutOutlined /> : tipo === 'boletim' ? <ArticleOutlined /> : <InsertLinkOutlined />);

/**
 * Painel de detalhe de uma operação: cabeçalho da nota, links do Drive,
 * seções de material (com local em tempo real) e outras determinações.
 */
export default function OperacaoDetalhe({
    operacao,
    materials = [],
    materialsById,
    alocacoesPorMaterial,
    viaturaPorMaterial,
    podeEditar = false,
    termoBusca = '',
    onVoltar,
    onEditar,
    onExcluir,
    onNovoItem,
    onEditarItem,
    onExcluirItem,
    onVincular,
    onEditarSecao,
    onExcluirSecao,
}) {
    const theme = useTheme();
    const op = operacao;
    const cor = op.cor || theme.palette.primary.main;
    const dark = theme.palette.mode === 'dark';
    // Texto de chips coloridos legível também no modo escuro
    const tx = (hex) => (dark ? lighten(hex, 0.5) : hex);

    const resumo = useMemo(() => resumirOperacao(op, materialsById), [op, materialsById]);
    const sugestoes = useMemo(() => {
        const mapa = new Map();
        for (const s of op.secoes || []) for (const i of s.itens || []) if (!i.material_id) mapa.set(i.id, sugerirMaterial(i.nome, materials, { sinonimos: i.sinonimos }));
        return mapa;
    }, [op, materials]);

    const termo = normalizeName(termoBusca);
    const destaca = (texto) => termo.length >= 2 && combinaBusca(normalizeName(texto), termo);

    const chips = [
        op.nota && { icone: <MenuBookOutlined sx={{ fontSize: '15px !important' }} />, label: op.nota },
        op.boletim && { icone: <ArticleOutlined sx={{ fontSize: '15px !important' }} />, label: `${op.boletim}${op.folhas ? ` · ${op.folhas}` : ''}` },
        op.vigencia && { icone: <EventOutlined sx={{ fontSize: '15px !important' }} />, label: `Vigência: ${op.vigencia}` },
    ].filter(Boolean);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Hero */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                    color: '#fff',
                    background: `linear-gradient(135deg, ${cor} 0%, ${alpha(cor, 0.72)} 60%, ${alpha('#1e3a5f', 0.9)} 100%)`,
                    p: { xs: 2, sm: 3 },
                    '&::after': { content: '""', position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%', background: alpha('#fff', 0.08), pointerEvents: 'none' },
                }}
            >
                <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, alignItems: 'flex-start', position: 'relative' }}>
                    {onVoltar && (
                        <IconButton onClick={onVoltar} sx={{ color: '#fff', bgcolor: alpha('#fff', 0.14), display: { md: 'none' }, mt: 0.25 }} size="small" aria-label="Voltar para a lista">
                            <ArrowBackRounded />
                        </IconButton>
                    )}
                    <OperacaoIcone icone={op.icone} cor="#fff" tamanho={52} sx={{ bgcolor: alpha('#fff', 0.18), color: '#fff', display: { xs: 'none', sm: 'flex' } }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1.2, lineHeight: 1.4, display: 'block' }}>
                            {op.categoria === 'norma' ? 'Norma de base' : op.categoria === 'outra' ? 'Outra operação' : 'Operação recorrente'}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.15, fontSize: { xs: '1.25rem', sm: '1.6rem' } }}>{op.nome}</Typography>
                        {op.subtitulo && <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.25 }}>{op.subtitulo}</Typography>}
                        {chips.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1.5 }}>
                                {chips.map((c, i) => (
                                    <Chip key={i} size="small" icon={c.icone} label={c.label} sx={{ bgcolor: alpha('#fff', 0.16), color: '#fff', fontWeight: 600, '& .MuiChip-icon': { color: '#fff' }, height: 26, maxWidth: '100%' }} />
                                ))}
                            </Box>
                        )}
                    </Box>
                    {podeEditar && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                            <Tooltip title="Editar operação"><IconButton onClick={() => onEditar?.(op)} sx={{ color: '#fff', bgcolor: alpha('#fff', 0.14), '&:hover': { bgcolor: alpha('#fff', 0.25) } }} size="small" aria-label="Editar operação"><EditOutlined fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Excluir operação"><IconButton onClick={() => onExcluir?.(op)} sx={{ color: '#fff', bgcolor: alpha('#fff', 0.14), '&:hover': { bgcolor: alpha('#dc2626', 0.7) } }} size="small" aria-label="Excluir operação"><DeleteOutline fontSize="small" /></IconButton></Tooltip>
                        </Box>
                    )}
                </Box>

                {op.descricao && (
                    <Typography variant="body2" sx={{ mt: 2, opacity: 0.92, maxWidth: 760, position: 'relative' }}>{op.descricao}</Typography>
                )}

                {/* Links */}
                {(op.links || []).length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2, position: 'relative' }}>
                        {op.links.map((l) => (
                            <Button
                                key={l.id}
                                component="a"
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="contained"
                                size="small"
                                startIcon={<IconeLink tipo={l.tipo} />}
                                endIcon={<OpenInNew sx={{ fontSize: '14px !important', opacity: 0.8 }} />}
                                sx={{ bgcolor: '#fff', color: cor, fontWeight: 800, textTransform: 'none', borderRadius: 2, '&:hover': { bgcolor: alpha('#fff', 0.9), transform: 'translateY(-1px)' }, boxShadow: `0 4px 14px ${alpha('#000', 0.2)}` }}
                            >
                                {l.rotulo}
                            </Button>
                        ))}
                    </Box>
                )}
            </Paper>

            {/* Resumo do estoque */}
            {resumo.total > 0 && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mr: 0.5 }}>{resumo.total} {resumo.total === 1 ? 'material previsto' : 'materiais previstos'}</Typography>
                    {resumo.ok > 0 && <Chip size="small" label={`${resumo.ok} disponível(is)`} sx={{ bgcolor: alpha('#16a34a', 0.12), color: tx('#15803d'), fontWeight: 700, height: 24 }} />}
                    {resumo.abaixo > 0 && <Chip size="small" label={`${resumo.abaixo} abaixo do previsto`} sx={{ bgcolor: alpha('#d97706', 0.14), color: tx('#b45309'), fontWeight: 700, height: 24 }} />}
                    {resumo.checklist > 0 && <Chip size="small" label={`${resumo.checklist} de checklist`} sx={{ bgcolor: alpha('#0891b2', 0.12), color: tx('#0e7490'), fontWeight: 700, height: 24 }} />}
                    {resumo.semVinculo > 0 && <Chip size="small" label={`${resumo.semVinculo} sem vínculo com o estoque`} sx={{ bgcolor: alpha('#64748b', 0.12), color: tx('#475569'), fontWeight: 700, height: 24 }} />}
                </Box>
            )}

            {/* Seções de material */}
            {(op.secoes || []).map((secao) => (
                <Paper key={secao.id} elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(cor, 0.25)}`, overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: { xs: 1.5, sm: 2 }, py: 1.25, bgcolor: alpha(cor, dark ? 0.16 : 0.06), borderBottom: `1px solid ${alpha(cor, 0.15)}` }}>
                        <Box sx={{ width: 6, alignSelf: 'stretch', borderRadius: 3, bgcolor: cor, mr: 0.5 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>{secao.titulo}</Typography>
                            {secao.referencia && <Typography variant="caption" color="text.secondary">{secao.referencia}</Typography>}
                        </Box>
                        <Chip size="small" label={`${(secao.itens || []).length} ${(secao.itens || []).length === 1 ? 'item' : 'itens'}`} sx={{ height: 22, fontWeight: 700, bgcolor: alpha(cor, 0.12), color: cor }} />
                        {podeEditar && (
                            <>
                                <Tooltip title="Incluir material nesta seção"><IconButton size="small" onClick={() => onNovoItem?.(secao.id)} aria-label="Incluir material"><Add fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Editar seção"><IconButton size="small" onClick={() => onEditarSecao?.(secao)} aria-label="Editar seção"><EditOutlined fontSize="small" /></IconButton></Tooltip>
                                <Tooltip title="Excluir seção"><IconButton size="small" color="error" onClick={() => onExcluirSecao?.(secao)} aria-label="Excluir seção"><DeleteOutline fontSize="small" /></IconButton></Tooltip>
                            </>
                        )}
                    </Box>
                    <Box sx={{ p: { xs: 1.25, sm: 1.75 }, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
                        {(secao.itens || []).length === 0 && (
                            <Typography variant="body2" color="text.secondary" sx={{ gridColumn: '1 / -1', py: 1 }}>Nenhum material nesta seção.</Typography>
                        )}
                        {(secao.itens || []).map((item) => {
                            const material = item.material_id ? materialsById.get(item.material_id) : null;
                            return (
                                <MaterialOperacaoLinha
                                    key={item.id}
                                    item={{ ...item, secaoId: secao.id }}
                                    material={material || null}
                                    alocacoes={material ? (alocacoesPorMaterial.get(material.id) || []) : []}
                                    emViatura={material ? (viaturaPorMaterial.get(material.id) || []) : []}
                                    sugestao={material ? null : sugestoes.get(item.id)}
                                    podeEditar={podeEditar}
                                    destacado={destaca(`${item.nome} ${material?.description || ''}`)}
                                    onEditar={(i) => onEditarItem?.({ ...i, secaoId: secao.id })}
                                    onExcluir={(i) => onExcluirItem?.({ ...i, secaoId: secao.id })}
                                    onVincular={(i, m) => onVincular?.({ ...i, secaoId: secao.id }, m)}
                                />
                            );
                        })}
                    </Box>
                </Paper>
            ))}

            {(op.secoes || []).length === 0 && (
                <Paper elevation={0} sx={{ borderRadius: 3, border: `1px dashed ${alpha(theme.palette.text.secondary, 0.35)}`, p: 3, textAlign: 'center' }}>
                    <PlaylistAddOutlined sx={{ fontSize: 36, color: 'text.disabled' }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {op.categoria === 'operacao' ? 'Esta operação ainda não tem material previsto cadastrado.' : 'Esta nota não traz lista própria de material.'}
                    </Typography>
                </Paper>
            )}

            {podeEditar && (
                <Button variant="outlined" startIcon={<PlaylistAddOutlined />} onClick={() => onNovoItem?.(null)} sx={{ alignSelf: 'flex-start', borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                    Incluir material / nova seção
                </Button>
            )}

            {/* Outras determinações */}
            {(op.observacoes || []).length > 0 && (
                <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 1)}`, p: { xs: 1.75, sm: 2.25 } }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                        <NotesOutlined color="primary" /> Outras determinações da nota
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
                        {op.observacoes.map((o) => (
                            <Box key={o.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(cor, dark ? 0.1 : 0.04), borderLeft: `3px solid ${alpha(cor, 0.6)}` }}>
                                {o.titulo && <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>{o.titulo}</Typography>}
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>{o.texto}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>
            )}

            {/* Base NPEPI */}
            {op.categoria === 'operacao' && (
                <>
                    <Divider />
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <OperacaoIcone icone="epi" cor="#b45309" tamanho={36} />
                        <Box sx={{ flex: 1, minWidth: 220 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{NPEPI_REFERENCIA.titulo}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>{NPEPI_REFERENCIA.texto}</Typography>
                            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                                {NPEPI_REFERENCIA.links.map((l) => (
                                    <Button key={l.url} component="a" href={l.url} target="_blank" rel="noopener noreferrer" size="small" variant="outlined" endIcon={<OpenInNew sx={{ fontSize: '13px !important' }} />} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, color: '#b45309', borderColor: alpha('#b45309', 0.5) }}>
                                        {l.rotulo}
                                    </Button>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                </>
            )}
        </Box>
    );
}
