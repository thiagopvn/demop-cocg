import { Box, Paper, Typography, Chip, Tooltip, Skeleton, alpha, useTheme, IconButton } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat, InfoOutlined } from '@mui/icons-material';
import { fmtNum } from './painelUtils';

/* ------------------------------------------------------------------ */
/* Cartao de indicador (KPI)                                           */
/* ------------------------------------------------------------------ */
export function KpiTile({ titulo, valor, anterior, sufixo = '', icon: Icon, cor, ajuda, onClick, ativo = false, loading = false, formato = fmtNum, invertido = false }) {
    const theme = useTheme();
    const c = cor || theme.palette.primary.main;
    let delta = null;
    if (anterior !== null && anterior !== undefined) {
        if (anterior === 0) delta = valor > 0 ? 100 : 0;
        else delta = Math.round(((valor - anterior) / anterior) * 100);
    }
    const positivo = delta !== null && (invertido ? delta < 0 : delta > 0);
    const negativo = delta !== null && (invertido ? delta > 0 : delta < 0);
    const DeltaIcon = delta === null || delta === 0 ? TrendingFlat : delta > 0 ? TrendingUp : TrendingDown;

    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                height: '100%',
                minWidth: 0,
                cursor: onClick ? 'pointer' : 'default',
                border: `1px solid ${ativo ? c : alpha(theme.palette.divider, 1)}`,
                boxShadow: ativo ? `0 0 0 3px ${alpha(c, 0.15)}` : 'none',
                background: `linear-gradient(160deg, ${alpha(c, 0.08)} 0%, ${alpha(c, 0.02)} 100%)`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: `0 10px 24px ${alpha(c, 0.18)}` } : {},
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.66rem', lineHeight: 1.2 }}>
                    {titulo}
                </Typography>
                {Icon && (
                    <Box sx={{ width: 30, height: 30, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(c, 0.14), color: c, flexShrink: 0 }}>
                        <Icon sx={{ fontSize: 17 }} />
                    </Box>
                )}
            </Box>
            {loading ? (
                <Skeleton variant="text" width={80} height={36} />
            ) : (
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.45rem', sm: '1.7rem' }, lineHeight: 1.1, color: 'text.primary', letterSpacing: '-0.02em' }}>
                    {formato(valor)}{sufixo && <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'text.secondary', ml: 0.5 }}>{sufixo}</Box>}
                </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, minHeight: 18 }}>
                {delta !== null && !loading && (
                    <Tooltip title={`Período anterior: ${formato(anterior)}`}>
                        <Chip
                            icon={<DeltaIcon sx={{ fontSize: '0.9rem !important' }} />}
                            label={`${delta > 0 ? '+' : ''}${delta}%`}
                            size="small"
                            sx={{ height: 20, fontSize: '0.66rem', fontWeight: 700, bgcolor: alpha(positivo ? theme.palette.success.main : negativo ? theme.palette.error.main : theme.palette.text.secondary, 0.12), color: positivo ? theme.palette.success.dark : negativo ? theme.palette.error.dark : 'text.secondary', '& .MuiChip-icon': { color: 'inherit' } }}
                        />
                    </Tooltip>
                )}
                {ajuda && (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', lineHeight: 1.2 }} noWrap>{ajuda}</Typography>
                )}
            </Box>
        </Paper>
    );
}

/* ------------------------------------------------------------------ */
/* Cartao de grafico                                                    */
/* ------------------------------------------------------------------ */
export function ChartCard({ titulo, subtitulo, acao, children, altura, sx, ajuda }) {
    const theme = useTheme();
    return (
        <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2.25 }, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 1)}`, height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, ...sx }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {titulo}
                        {ajuda && (
                            <Tooltip title={ajuda} arrow>
                                <IconButton size="small" sx={{ p: 0.25, color: 'text.disabled' }}><InfoOutlined sx={{ fontSize: 15 }} /></IconButton>
                            </Tooltip>
                        )}
                    </Typography>
                    {subtitulo && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>{subtitulo}</Typography>}
                </Box>
                {acao}
            </Box>
            <Box sx={{ flex: 1, minHeight: altura || 240, width: '100%', minWidth: 0 }}>{children}</Box>
        </Paper>
    );
}

/* ------------------------------------------------------------------ */
/* Tooltip dos graficos (Recharts)                                     */
/* ------------------------------------------------------------------ */
export function TooltipGrafico({ active, payload, label, formatador }) {
    const theme = useTheme();
    if (!active || !payload || payload.length === 0) return null;
    const itens = payload.filter(p => p.value !== undefined && p.value !== null);
    return (
        <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[6], minWidth: 140, maxWidth: 260 }}>
            {label !== undefined && <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.5, color: 'text.primary' }}>{label}</Typography>}
            {itens.map((p) => (
                <Box key={p.dataKey || p.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.2 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: p.color || p.fill || theme.palette.primary.main, flexShrink: 0 }} />
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 0 }} noWrap>{p.name}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{formatador ? formatador(p.value, p) : fmtNum(p.value)}</Typography>
                </Box>
            ))}
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* Estado vazio                                                         */
/* ------------------------------------------------------------------ */
export function Vazio({ texto = 'Sem dados para os filtros escolhidos', altura = 200 }) {
    return (
        <Box sx={{ height: altura, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled', textAlign: 'center', px: 2 }}>
            <Typography variant="body2">{texto}</Typography>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* Mapa de calor dia da semana x hora                                   */
/* ------------------------------------------------------------------ */
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export function MapaCalor({ matriz, maximo, cor }) {
    const theme = useTheme();
    const c = cor || theme.palette.primary.main;
    const horas = Array.from({ length: 24 }, (_, i) => i);
    if (!maximo) return <Vazio />;
    return (
        <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: `34px repeat(24, minmax(14px, 1fr))`, gap: '2px', minWidth: 460 }}>
                <Box />
                {horas.map(h => (
                    <Typography key={h} variant="caption" sx={{ fontSize: '0.58rem', color: 'text.disabled', textAlign: 'center' }}>{h % 3 === 0 ? `${h}h` : ''}</Typography>
                ))}
                {matriz.map((linha, dia) => (
                    <Box key={dia} sx={{ display: 'contents' }}>
                        <Typography variant="caption" sx={{ fontSize: '0.66rem', fontWeight: 700, color: 'text.secondary', lineHeight: '16px' }}>{DIAS[dia]}</Typography>
                        {linha.map((v, h) => (
                            <Tooltip key={h} title={`${DIAS[dia]} ${h}h · ${v} movimentação(ões)`} enterDelay={200}>
                                <Box sx={{ height: 16, borderRadius: '3px', bgcolor: v === 0 ? alpha(theme.palette.text.primary, 0.05) : alpha(c, 0.15 + 0.85 * (v / maximo)), transition: 'transform 0.1s', '&:hover': { transform: 'scale(1.25)', outline: `2px solid ${theme.palette.background.paper}` } }} />
                            </Tooltip>
                        ))}
                    </Box>
                ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1, justifyContent: 'flex-end' }}>
                <Typography variant="caption" color="text.disabled">menos</Typography>
                {[0.15, 0.35, 0.6, 0.85, 1].map(k => <Box key={k} sx={{ width: 14, height: 10, borderRadius: '2px', bgcolor: alpha(c, k) }} />)}
                <Typography variant="caption" color="text.disabled">mais</Typography>
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* Lista ranqueada com barra proporcional (substitui graficos em listas) */
/* ------------------------------------------------------------------ */
export function ListaRanking({ itens, cor, onClick, ativoChave, formato = fmtNum, sufixo = '', vazio, maxItens = 10, avatar }) {
    const theme = useTheme();
    const c = cor || theme.palette.primary.main;
    const lista = (itens || []).slice(0, maxItens);
    if (lista.length === 0) return <Vazio texto={vazio} altura={160} />;
    const max = Math.max(...lista.map(i => i.valor), 1);
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {lista.map((item, idx) => {
                const ativo = ativoChave && item.chave === ativoChave;
                return (
                    <Box
                        key={item.chave ?? idx}
                        onClick={onClick ? () => onClick(item) : undefined}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.5, borderRadius: 1.5, cursor: onClick ? 'pointer' : 'default', bgcolor: ativo ? alpha(c, 0.12) : 'transparent', '&:hover': onClick ? { bgcolor: alpha(c, 0.08) } : {} }}
                    >
                        <Typography variant="caption" sx={{ width: 18, textAlign: 'right', color: 'text.disabled', fontWeight: 700, flexShrink: 0 }}>{idx + 1}</Typography>
                        {avatar && avatar(item)}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', lineHeight: 1.25 }} noWrap title={item.nome}>{item.nome}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>{formato(item.valor)}{sufixo}</Typography>
                            </Box>
                            <Box sx={{ mt: 0.4, height: 6, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, 0.06), overflow: 'hidden' }}>
                                <Box sx={{ width: `${Math.max(3, (item.valor / max) * 100)}%`, height: '100%', borderRadius: 3, bgcolor: c, transition: 'width 0.4s ease' }} />
                            </Box>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* Tabela compacta e rolavel                                            */
/* ------------------------------------------------------------------ */
export function TabelaCompacta({ colunas, linhas, vazio = 'Nada a mostrar', maxAltura = 360, onLinha }) {
    const theme = useTheme();
    if (!linhas || linhas.length === 0) return <Vazio texto={vazio} altura={140} />;
    return (
        <Box sx={{ overflow: 'auto', maxHeight: maxAltura, borderRadius: 2, border: `1px solid ${alpha(theme.palette.divider, 1)}` }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: colunas.length * 92 }}>
                <Box component="thead" sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <Box component="tr" sx={{ bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.25 : 0.08) }}>
                        {colunas.map(c => (
                            <Box key={c.chave} component="th" sx={{ textAlign: c.alinhar || 'left', p: '8px 10px', fontSize: '0.7rem', fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{c.titulo}</Box>
                        ))}
                    </Box>
                </Box>
                <Box component="tbody">
                    {linhas.map((l, i) => (
                        <Box key={l.id ?? i} component="tr" onClick={onLinha ? () => onLinha(l) : undefined} sx={{ cursor: onLinha ? 'pointer' : 'default', '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.text.primary, 0.02) }, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) } }}>
                            {colunas.map(c => (
                                <Box key={c.chave} component="td" sx={{ p: '7px 10px', fontSize: '0.8rem', textAlign: c.alinhar || 'left', borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`, whiteSpace: c.quebra ? 'normal' : 'nowrap', maxWidth: c.largura || 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {c.render ? c.render(l) : l[c.chave]}
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* Selo de status                                                       */
/* ------------------------------------------------------------------ */
export function Selo({ texto, cor = 'default', variante = 'soft' }) {
    const theme = useTheme();
    const mapa = { default: theme.palette.text.secondary, success: theme.palette.success.main, warning: theme.palette.warning.main, error: theme.palette.error.main, info: theme.palette.info.main, primary: theme.palette.primary.main };
    const c = mapa[cor] || cor;
    return <Chip label={texto} size="small" sx={{ height: 20, fontSize: '0.66rem', fontWeight: 700, bgcolor: variante === 'soft' ? alpha(c, 0.14) : c, color: variante === 'soft' ? c : '#fff' }} />;
}
