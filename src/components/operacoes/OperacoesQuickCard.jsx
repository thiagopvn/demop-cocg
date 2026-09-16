import { useMemo } from 'react';
import { Box, Button, ButtonBase, Card, Chip, Skeleton, Typography, alpha, useTheme } from '@mui/material';
import { ArrowForwardRounded, ChevronRightRounded, WarningAmberRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useOperacoes } from '../../hooks/useOperacoes';
import { useMaterials } from '../../contexts/MaterialContext';
import { resumirOperacao } from '../../services/operacoesService';
import { IconeOperacao } from './OperacaoIcone';
import logoGocg from '../../assets/logo-gocg.jpg';

const NAVY = '#0f2440';
const NAVY_2 = '#1e3a5f';
const VERMELHO = '#c8102e';

/** Logo circular do GOCG (a imagem tem fundo preto nos cantos, por isso o recorte redondo). */
export function LogoGocg({ tamanho = 56, sx }) {
    return (
        <Box
            component="img"
            src={logoGocg}
            alt="GOCG"
            sx={{ width: tamanho, height: tamanho, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: `0 6px 18px ${alpha('#000', 0.35)}`, ...sx }}
        />
    );
}

/**
 * Card do Dashboard "MATERIAIS DAS OPERAÇÕES DO CBMERJ".
 * Cada linha abre a operação; o botão do rodapé abre o painel completo.
 */
export default function OperacoesQuickCard() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { operacoes, loading } = useOperacoes();
    const { materials } = useMaterials();

    const dados = useMemo(() => {
        const materialsById = new Map(materials.map((m) => [m.id, m]));
        let itens = 0;
        let links = 0;
        let abaixo = 0;
        const linhas = [];
        for (const op of operacoes) {
            const r = resumirOperacao(op, materialsById);
            itens += r.total;
            links += (op.links || []).length;
            abaixo += r.abaixo;
            if (op.categoria === 'operacao') linhas.push({ op, resumo: r });
        }
        return { linhas, total: operacoes.length, itens, links, abaixo };
    }, [operacoes, materials]);

    if (loading) return <Skeleton variant="rounded" height={260} sx={{ borderRadius: 3 }} />;

    const dark = theme.palette.mode === 'dark';

    return (
        <Card
            elevation={0}
            sx={{
                height: '100%',
                borderRadius: 3,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                color: '#fff',
                background: `linear-gradient(160deg, ${NAVY_2} 0%, ${NAVY} 70%)`,
                border: `1px solid ${alpha('#fff', dark ? 0.12 : 0.06)}`,
                boxShadow: `0 10px 30px ${alpha(NAVY, 0.35)}`,
                '&:hover': { transform: 'none' },
            }}
        >
            {/* Cabeçalho */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, p: { xs: 2, sm: 2.25 }, pb: { xs: 1.5, sm: 1.75 }, borderBottom: `3px solid ${VERMELHO}` }}>
                <LogoGocg tamanho={58} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: { xs: '0.95rem', sm: '1.05rem' }, lineHeight: 1.15, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                        Materiais das Operações do CBMERJ
                    </Typography>
                    <Typography variant="caption" sx={{ color: alpha('#fff', 0.72), display: 'block', mt: 0.35, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>
                        GOCG · material previsto por nota e onde está no DEMOP
                    </Typography>
                </Box>
            </Box>

            {/* Números */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, px: { xs: 2, sm: 2.25 }, pt: 1.75 }}>
                {[
                    { n: dados.total, rotulo: 'Operações e normas' },
                    { n: dados.itens, rotulo: 'Materiais previstos' },
                    { n: dados.links, rotulo: 'Links do Drive' },
                ].map((t) => (
                    <Box key={t.rotulo} sx={{ borderRadius: 2, p: 1, bgcolor: alpha('#fff', 0.07), border: `1px solid ${alpha('#fff', 0.08)}`, textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 900, fontSize: '1.35rem', lineHeight: 1 }}>{t.n}</Typography>
                        <Typography variant="caption" sx={{ color: alpha('#fff', 0.7), textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.6rem', fontWeight: 700 }}>{t.rotulo}</Typography>
                    </Box>
                ))}
            </Box>

            {dados.abaixo > 0 && (
                <Box sx={{ mx: { xs: 2, sm: 2.25 }, mt: 1.25, px: 1.25, py: 0.75, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: alpha('#f59e0b', 0.16), border: `1px solid ${alpha('#f59e0b', 0.45)}` }}>
                    <WarningAmberRounded sx={{ fontSize: 18, color: '#fbbf24' }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: '#fde68a' }}>
                        {dados.abaixo} {dados.abaixo === 1 ? 'material abaixo do previsto' : 'materiais abaixo do previsto'}
                    </Typography>
                </Box>
            )}

            {/* Operações recorrentes */}
            <Box sx={{ px: { xs: 2, sm: 2.25 }, pt: 1.75, pb: 0.5, flex: 1 }}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.6), textTransform: 'uppercase', letterSpacing: 1, fontWeight: 800, display: 'block', mb: 0.75 }}>
                    Operações recorrentes
                </Typography>
                {dados.linhas.length === 0 ? (
                    <Typography variant="body2" sx={{ color: alpha('#fff', 0.75) }}>
                        Nenhuma operação cadastrada ainda. Abra o painel para carregar as operações do levantamento.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                        {dados.linhas.map(({ op, resumo }) => (
                            <ButtonBase
                                key={op.id}
                                onClick={() => navigate(`/operacoes/${op.id}`)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    width: '100%',
                                    textAlign: 'left',
                                    p: 1,
                                    borderRadius: 2,
                                    bgcolor: alpha('#fff', 0.05),
                                    border: `1px solid ${alpha('#fff', 0.07)}`,
                                    transition: 'background-color .15s, transform .15s',
                                    '&:hover': { bgcolor: alpha('#fff', 0.12), transform: 'translateX(3px)' },
                                }}
                            >
                                <Box sx={{ width: 34, height: 34, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: op.cor || VERMELHO, color: '#fff', flexShrink: 0 }}>
                                    <IconeOperacao icone={op.icone} sx={{ fontSize: 19 }} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" noWrap sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                                        {op.nome}
                                    </Typography>
                                    <Typography variant="caption" noWrap sx={{ color: alpha('#fff', 0.65), display: 'block' }}>
                                        {op.nota || op.subtitulo}{resumo.total ? ` · ${resumo.total} materiais` : ''}{(op.links || []).length ? ` · ${op.links.length} ${op.links.length === 1 ? 'link' : 'links'}` : ''}
                                    </Typography>
                                </Box>
                                {resumo.abaixo > 0 && (
                                    <Chip size="small" icon={<WarningAmberRounded sx={{ fontSize: '13px !important', color: '#fbbf24 !important' }} />} label={resumo.abaixo} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, bgcolor: alpha('#f59e0b', 0.2), color: '#fde68a', '& .MuiChip-label': { px: 0.6 } }} />
                                )}
                                <ChevronRightRounded sx={{ color: alpha('#fff', 0.5) }} />
                            </ButtonBase>
                        ))}
                    </Box>
                )}
            </Box>

            {/* Rodapé */}
            <Box sx={{ p: { xs: 2, sm: 2.25 }, pt: 1.25 }}>
                <Button
                    fullWidth
                    variant="contained"
                    endIcon={<ArrowForwardRounded />}
                    onClick={() => navigate('/operacoes')}
                    sx={{ bgcolor: VERMELHO, color: '#fff', fontWeight: 900, letterSpacing: 0.6, textTransform: 'uppercase', borderRadius: 2, py: 1.1, boxShadow: `0 6px 18px ${alpha(VERMELHO, 0.4)}`, '&:hover': { bgcolor: '#a50d26' } }}
                >
                    Abrir painel de operações
                </Button>
            </Box>
        </Card>
    );
}
