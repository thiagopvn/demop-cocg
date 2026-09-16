import { useMemo } from 'react';
import { Box, Card, CardContent, Chip, Skeleton, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { ArrowForwardRounded, Inventory2Outlined, LinkOutlined, ShieldOutlined, WarningAmberRounded } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useOperacoes } from '../../hooks/useOperacoes';
import { useMaterials } from '../../contexts/MaterialContext';
import { contarItens, resumirOperacao } from '../../services/operacoesService';
import OperacaoIcone, { IconeOperacao } from './OperacaoIcone';

const AZUL = '#1e3a5f';
const LARANJA = '#ff6b35';

/**
 * Card do Dashboard "Materiais das Operações do CBMERJ" (ao lado do compressor fixo).
 * Todo o card abre a tela /operacoes; cada chip de operação abre direto o detalhe dela.
 */
export default function OperacoesQuickCard() {
    const theme = useTheme();
    const navigate = useNavigate();
    const { operacoes, loading } = useOperacoes();
    const { materials } = useMaterials();

    const resumo = useMemo(() => {
        const materialsById = new Map(materials.map((m) => [m.id, m]));
        const recorrentes = operacoes.filter((o) => o.categoria === 'operacao');
        let itens = 0;
        let links = 0;
        let abaixo = 0;
        for (const op of operacoes) {
            itens += contarItens(op);
            links += (op.links || []).length;
            abaixo += resumirOperacao(op, materialsById).abaixo;
        }
        return { recorrentes, total: operacoes.length, itens, links, abaixo };
    }, [operacoes, materials]);

    if (loading) return <Skeleton variant="rounded" height={150} sx={{ borderRadius: 3 }} />;

    const dark = theme.palette.mode === 'dark';
    const abrir = (id) => navigate(id ? `/operacoes/${id}` : '/operacoes');

    return (
        <Card
            role="button"
            tabIndex={0}
            onClick={() => abrir()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } }}
            sx={{
                height: '100%',
                borderRadius: 3,
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                border: '2px solid',
                borderColor: alpha(AZUL, dark ? 0.55 : 0.25),
                background: dark
                    ? `linear-gradient(135deg, ${alpha(AZUL, 0.45)} 0%, ${alpha(LARANJA, 0.12)} 100%)`
                    : `linear-gradient(135deg, ${alpha(AZUL, 0.07)} 0%, ${alpha(LARANJA, 0.06)} 100%)`,
                transition: 'transform .2s, box-shadow .2s, border-color .2s',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 10px 28px ${alpha(AZUL, 0.22)}`, borderColor: alpha(LARANJA, 0.7) },
                '&:focus-visible': { outline: `3px solid ${alpha(LARANJA, 0.6)}`, outlineOffset: 2 },
                '&::before': {
                    content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: 5,
                    background: `linear-gradient(90deg, ${AZUL} 0%, ${LARANJA} 100%)`,
                },
                '&::after': {
                    content: '""', position: 'absolute', right: -40, bottom: -40, width: 150, height: 150, borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(LARANJA, dark ? 0.18 : 0.12)} 0%, transparent 70%)`, pointerEvents: 'none',
                },
            }}
        >
            <CardContent sx={{ p: { xs: 1.75, sm: 2.25 }, '&:last-child': { pb: { xs: 1.75, sm: 2.25 } }, position: 'relative' }}>
                {/* Cabeçalho */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.25 }}>
                    <OperacaoIcone icone="pc" cor={AZUL} tamanho={38} variante="solida" sx={{ background: `linear-gradient(135deg, ${AZUL}, ${alpha(LARANJA, 0.9)})` }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.15 }}>
                            Materiais das Operações do CBMERJ
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Notas, material previsto por GRD e onde está no DEMOP
                        </Typography>
                    </Box>
                    <ArrowForwardRounded sx={{ color: 'text.secondary', fontSize: 20 }} />
                </Box>

                {/* Números */}
                <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2.5 }, mb: 1.25, flexWrap: 'wrap' }}>
                    <Box>
                        <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1, color: 'primary.main' }}>{resumo.total}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}><ShieldOutlined sx={{ fontSize: 13 }} /> operações e normas</Typography>
                    </Box>
                    <Box>
                        <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1, color: 'primary.main' }}>{resumo.itens}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}><Inventory2Outlined sx={{ fontSize: 13 }} /> materiais previstos</Typography>
                    </Box>
                    <Box>
                        <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1, color: 'primary.main' }}>{resumo.links}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}><LinkOutlined sx={{ fontSize: 13 }} /> links do Drive</Typography>
                    </Box>
                    {resumo.abaixo > 0 && (
                        <Tooltip title="Itens cujo disponível para retirada imediata está abaixo da quantidade da nota" arrow>
                            <Chip
                                size="small"
                                icon={<WarningAmberRounded sx={{ fontSize: '15px !important' }} />}
                                label={`${resumo.abaixo} abaixo do previsto`}
                                color="warning"
                                variant="outlined"
                                sx={{ alignSelf: 'center', ml: 'auto', fontWeight: 700, fontSize: '0.68rem', height: 24 }}
                            />
                        </Tooltip>
                    )}
                </Box>

                {/* Operações recorrentes */}
                {resumo.total === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                        Nenhuma operação cadastrada ainda. Abra o painel para carregar as operações do levantamento.
                    </Typography>
                ) : (
                    <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                        {resumo.recorrentes.map((op) => (
                            <Chip
                                key={op.id}
                                size="small"
                                icon={<IconeOperacao icone={op.icone} sx={{ fontSize: '15px !important', color: `${op.cor} !important` }} />}
                                label={op.nome.replace(/^Operação\s+/i, '')}
                                onClick={(e) => { e.stopPropagation(); abrir(op.id); }}
                                sx={{
                                    fontWeight: 700,
                                    fontSize: '0.72rem',
                                    height: 26,
                                    bgcolor: alpha(op.cor || AZUL, dark ? 0.22 : 0.1),
                                    color: dark ? '#fff' : op.cor || AZUL,
                                    border: `1px solid ${alpha(op.cor || AZUL, 0.35)}`,
                                    '&:hover': { bgcolor: alpha(op.cor || AZUL, 0.25) },
                                }}
                            />
                        ))}
                    </Box>
                )}
            </CardContent>
        </Card>
    );
}
