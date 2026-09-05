import { Box, Typography, Button, Skeleton, alpha, useTheme } from '@mui/material';
import { Warehouse, AddLocationAlt } from '@mui/icons-material';
import { useAlocacoesDoMaterial } from '../../hooks/useLocais';
import { alocacaoComoLocal, ordenarLocais } from '../../services/localizacaoService';
import LocalChip from './LocalChip';

/**
 * Painel curto que diz onde um material fica guardado no DEMOP.
 * Usado nos fluxos que trazem material de volta (devolucao, reparo, desalocacao de viatura)
 * e na cautela ("retirar de"). Nao altera nada — so consulta em tempo real.
 *
 * @param {string} materialId
 * @param {string} [titulo]  ex.: "Guardar em" | "Retirar de"
 * @param {function} [onDefinir] se informado, mostra botao para definir o local quando nao houver
 * @param {boolean} [compact] versao inline (uma linha) para listas
 */
export default function MaterialLocalHint({ materialId, titulo = 'Guardar em', onDefinir, compact = false, sx }) {
    const theme = useTheme();
    const { alocacoes, loading } = useAlocacoesDoMaterial(materialId);

    const ordenadas = [...alocacoes].sort((a, b) => ordenarLocais(alocacaoComoLocal(a), alocacaoComoLocal(b)));
    const temLocal = ordenadas.length > 0;
    const cor = temLocal ? theme.palette.success.main : theme.palette.warning.main;

    if (compact) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.5, ...sx }}>
                <Warehouse sx={{ fontSize: 15, color: temLocal ? 'text.secondary' : 'warning.main' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {titulo}:
                </Typography>
                {loading ? (
                    <Skeleton variant="rounded" width={90} height={20} />
                ) : temLocal ? (
                    ordenadas.map(a => (
                        <LocalChip key={a.id} local={alocacaoComoLocal(a)} quantidade={a.quantidade} sx={{ height: 22, fontSize: '0.7rem' }} />
                    ))
                ) : (
                    <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                        sem local definido
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                mt: 2,
                p: 1.75,
                borderRadius: 2.5,
                border: `1px solid ${alpha(cor, 0.35)}`,
                background: `linear-gradient(135deg, ${alpha(cor, 0.08)} 0%, ${alpha(cor, 0.02)} 100%)`,
                ...sx,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: alpha(cor, 0.15), color: cor, display: 'flex' }}>
                    <Warehouse fontSize="small" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, color: cor }}>
                        {titulo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {loading
                            ? 'Consultando locais...'
                            : temLocal
                                ? 'Local de guarda deste material no DEMOP'
                                : 'Este material ainda não tem local definido no DEMOP'}
                    </Typography>
                </Box>
                {!loading && !temLocal && onDefinir && (
                    <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        startIcon={<AddLocationAlt />}
                        onClick={onDefinir}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                        Definir local
                    </Button>
                )}
            </Box>
            {loading ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Skeleton variant="rounded" width={100} height={26} />
                    <Skeleton variant="rounded" width={80} height={26} />
                </Box>
            ) : temLocal ? (
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {ordenadas.map(a => (
                        <LocalChip key={a.id} local={alocacaoComoLocal(a)} quantidade={a.quantidade} completo size="medium" sx={{ height: 30 }} />
                    ))}
                </Box>
            ) : null}
        </Box>
    );
}
