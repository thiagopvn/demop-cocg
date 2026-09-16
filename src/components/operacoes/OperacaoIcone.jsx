import { Box, alpha } from '@mui/material';
import {
    LocalFireDepartment,
    Thunderstorm,
    Waves,
    Celebration,
    MusicNote,
    Gavel,
    HealthAndSafety,
    Event,
    Campaign,
} from '@mui/icons-material';

const ICONES = {
    fogo: LocalFireDepartment,
    chuva: Thunderstorm,
    mar: Waves,
    festa: Celebration,
    carnaval: MusicNote,
    norma: Gavel,
    epi: HealthAndSafety,
    evento: Event,
    pc: Campaign,
};

/** Só o desenho do ícone (para selects e chips). */
export function IconeOperacao({ icone, ...props }) {
    const Icone = ICONES[icone] || Event;
    return <Icone {...props} />;
}

/**
 * Ícone da operação dentro de um quadrado colorido (cor da operação).
 * `variante="solida"` usa fundo cheio (para o hero do detalhe).
 */
export default function OperacaoIcone({ icone, cor = '#1e3a5f', tamanho = 40, variante = 'suave', sx }) {
    const solida = variante === 'solida';
    return (
        <Box
            sx={{
                width: tamanho,
                height: tamanho,
                borderRadius: tamanho >= 48 ? 3 : 2,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: solida ? cor : alpha(cor, 0.14),
                color: solida ? '#fff' : cor,
                boxShadow: solida ? `0 6px 18px ${alpha(cor, 0.35)}` : 'none',
                ...sx,
            }}
        >
            <IconeOperacao icone={icone} sx={{ fontSize: Math.round(tamanho * 0.55) }} />
        </Box>
    );
}
