import { useMemo, useState } from 'react';
import { Box, Chip, Popover, TextField, InputAdornment, Typography, ToggleButtonGroup, ToggleButton, Checkbox, ButtonBase, Divider, alpha, useTheme } from '@mui/material';
import { ArrowDropDown, Search, Check, Close } from '@mui/icons-material';
import UserAvatar from '../UserAvatar';
import { PERIODOS, TIPOS_MOV, corTipo } from './painelUtils';

/**
 * Pilula de filtro: chip que abre uma lista com busca.
 * `opcoes`: [{ valor, rotulo, sub, cor, avatar }]
 * `valor`: string (simples) ou array (multi)
 */
function FiltroPill({ rotulo, opcoes, valor, onChange, multi = false, placeholder = 'Buscar...', icone, renderOpcao }) {
    const theme = useTheme();
    const [anchor, setAnchor] = useState(null);
    const [busca, setBusca] = useState('');
    const aberto = Boolean(anchor);

    const selecionados = multi ? (valor || []) : (valor ? [valor] : []);
    const ativo = selecionados.length > 0;
    const rotuloAtivo = useMemo(() => {
        if (!ativo) return rotulo;
        if (multi) {
            if (selecionados.length === 1) return opcoes.find(o => o.valor === selecionados[0])?.rotulo || rotulo;
            return `${rotulo}: ${selecionados.length}`;
        }
        return opcoes.find(o => o.valor === valor)?.rotulo || rotulo;
    }, [ativo, multi, selecionados, opcoes, valor, rotulo]);

    const filtradas = useMemo(() => {
        const t = busca.trim().toLowerCase();
        const lista = t ? opcoes.filter(o => `${o.rotulo} ${o.sub || ''}`.toLowerCase().includes(t)) : opcoes;
        return lista.slice(0, 60);
    }, [opcoes, busca]);

    const escolher = (o) => {
        if (multi) {
            const atual = valor || [];
            onChange(atual.includes(o.valor) ? atual.filter(v => v !== o.valor) : [...atual, o.valor]);
        } else {
            onChange(valor === o.valor ? '' : o.valor);
            setAnchor(null);
        }
    };

    const c = theme.palette.primary.main;
    return (
        <>
            <Chip
                icon={icone}
                label={rotuloAtivo}
                deleteIcon={ativo ? <Close sx={{ fontSize: '1rem !important' }} /> : <ArrowDropDown />}
                onDelete={ativo ? () => onChange(multi ? [] : '') : (e) => setAnchor(e.currentTarget.parentElement)}
                onClick={(e) => setAnchor(e.currentTarget)}
                sx={{
                    height: 32,
                    borderRadius: 999,
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    maxWidth: 260,
                    bgcolor: ativo ? alpha(c, 0.12) : 'transparent',
                    color: ativo ? c : 'text.primary',
                    border: `1px solid ${ativo ? alpha(c, 0.6) : alpha(theme.palette.text.primary, 0.18)}`,
                    '&:hover': { bgcolor: alpha(c, ativo ? 0.18 : 0.06) },
                    '& .MuiChip-deleteIcon': { color: ativo ? c : 'text.secondary', '&:hover': { color: c } },
                    '& .MuiChip-icon': { color: ativo ? c : 'text.secondary' },
                }}
            />
            <Popover
                open={aberto}
                anchorEl={anchor}
                onClose={() => { setAnchor(null); setBusca(''); }}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                slotProps={{ paper: { sx: { mt: 0.75, width: 300, maxWidth: 'calc(100vw - 24px)', borderRadius: 2.5, boxShadow: theme.shadows[8], overflow: 'hidden' } } }}
            >
                {opcoes.length > 8 && (
                    <Box sx={{ p: 1.25, pb: 0.75 }}>
                        <TextField
                            size="small"
                            fullWidth
                            autoFocus
                            placeholder={placeholder}
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                    </Box>
                )}
                <Box sx={{ maxHeight: 320, overflowY: 'auto', py: 0.5 }}>
                    {filtradas.length === 0 && <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>Nada encontrado</Typography>}
                    {filtradas.map((o) => {
                        const marcado = selecionados.includes(o.valor);
                        return (
                            <ButtonBase key={o.valor} onClick={() => escolher(o)} sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, textAlign: 'left', bgcolor: marcado ? alpha(c, 0.08) : 'transparent', '&:hover': { bgcolor: alpha(c, 0.06) } }}>
                                {multi ? <Checkbox size="small" checked={marcado} sx={{ p: 0 }} /> : <Box sx={{ width: 18, display: 'flex', justifyContent: 'center' }}>{marcado && <Check sx={{ fontSize: 16, color: c }} />}</Box>}
                                {renderOpcao ? renderOpcao(o) : (
                                    <>
                                        {o.cor && <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: o.cor, flexShrink: 0 }} />}
                                        {o.avatar}
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: marcado ? 700 : 500, lineHeight: 1.25 }} noWrap>{o.rotulo}</Typography>
                                            {o.sub && <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{o.sub}</Typography>}
                                        </Box>
                                    </>
                                )}
                            </ButtonBase>
                        );
                    })}
                    {opcoes.length > 60 && filtradas.length === 60 && <Typography variant="caption" color="text.disabled" sx={{ px: 2, py: 1, display: 'block' }}>Digite para refinar (mostrando 60 de {opcoes.length})</Typography>}
                </Box>
                {multi && (
                    <>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, py: 0.75 }}>
                            <ButtonBase onClick={() => onChange([])} sx={{ fontSize: '0.78rem', color: 'text.secondary', px: 1, borderRadius: 1 }}>Limpar</ButtonBase>
                            <ButtonBase onClick={() => setAnchor(null)} sx={{ fontSize: '0.78rem', fontWeight: 700, color: c, px: 1, borderRadius: 1 }}>Aplicar</ButtonBase>
                        </Box>
                    </>
                )}
            </Popover>
        </>
    );
}

/**
 * Barra de filtros do painel: periodo segmentado + pilulas + busca.
 * `empilhado` = layout vertical (folha do celular).
 */
export default function PainelFiltros({ filtros, setFiltro, categorias, militares, viaturas, materiais, obms, escuro, empilhado = false }) {
    const theme = useTheme();

    const opCategorias = useMemo(() => categorias.map(c => ({ valor: c, rotulo: c })), [categorias]);
    const opMilitares = useMemo(() => militares.map(u => ({ valor: u.id, rotulo: u.full_name, sub: u.OBM || '', avatar: <UserAvatar src={u.foto_url} name={u.full_name} role={u.role} size={22} /> })), [militares]);
    const opViaturas = useMemo(() => viaturas.map(v => ({ valor: v.id, rotulo: v.prefixo || v.description || v.id, sub: v.prefixo ? v.description || '' : '' })), [viaturas]);
    const opMateriais = useMemo(() => materiais.map(m => ({ valor: m.id, rotulo: m.description || '', sub: m.categoria || '' })), [materiais]);
    const opObms = useMemo(() => obms.map(o => ({ valor: o, rotulo: o })), [obms]);
    const opTipos = useMemo(() => TIPOS_MOV.map(t => ({ valor: t.key, rotulo: t.label, cor: corTipo(t.key, escuro) })), [escuro]);

    const periodo = (
        <ToggleButtonGroup
            exclusive
            size="small"
            value={filtros.periodo}
            onChange={(_, v) => v && setFiltro('periodo', v)}
            sx={{
                flexWrap: 'wrap',
                bgcolor: alpha(theme.palette.text.primary, 0.04),
                borderRadius: 999,
                p: '3px',
                gap: '2px',
                '& .MuiToggleButtonGroup-grouped': { border: 0, borderRadius: '999px !important', px: 1.5, py: 0.45, textTransform: 'none', fontWeight: 600, fontSize: '0.78rem', color: 'text.secondary', minWidth: 0, lineHeight: 1.3 },
                '& .Mui-selected': { bgcolor: `${theme.palette.background.paper} !important`, color: `${theme.palette.primary.main} !important`, boxShadow: theme.shadows[1] },
            }}
        >
            {PERIODOS.map(p => <ToggleButton key={p.value} value={p.value}>{p.label}</ToggleButton>)}
        </ToggleButtonGroup>
    );

    const datas = filtros.periodo === 'custom' && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField size="small" type="date" label="De" value={filtros.inicio} onChange={(e) => setFiltro('inicio', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150, '& .MuiOutlinedInput-root': { borderRadius: 999, height: 34 } }} />
            <TextField size="small" type="date" label="Até" value={filtros.fim} onChange={(e) => setFiltro('fim', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150, '& .MuiOutlinedInput-root': { borderRadius: 999, height: 34 } }} />
        </Box>
    );

    const pilulas = (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
            <FiltroPill rotulo="Tipo" opcoes={opTipos} valor={filtros.tipos} onChange={(v) => setFiltro('tipos', v)} multi />
            <FiltroPill rotulo="Categoria" opcoes={opCategorias} valor={filtros.categoria} onChange={(v) => setFiltro('categoria', v)} placeholder="Buscar categoria" />
            <FiltroPill rotulo="Militar" opcoes={opMilitares} valor={filtros.militar} onChange={(v) => setFiltro('militar', v)} placeholder="Nome do militar" />
            <FiltroPill rotulo="Viatura" opcoes={opViaturas} valor={filtros.viatura} onChange={(v) => setFiltro('viatura', v)} placeholder="Prefixo ou descrição" />
            <FiltroPill rotulo="Material" opcoes={opMateriais} valor={filtros.material} onChange={(v) => setFiltro('material', v)} placeholder="Descrição do material" />
            <FiltroPill rotulo="OBM" opcoes={opObms} valor={filtros.obm} onChange={(v) => setFiltro('obm', v)} placeholder="OBM" />
        </Box>
    );

    const busca = (
        <TextField
            size="small"
            placeholder="Buscar em tudo..."
            value={filtros.busca}
            onChange={(e) => setFiltro('busca', e.target.value)}
            sx={{ width: empilhado ? '100%' : 260, '& .MuiOutlinedInput-root': { borderRadius: 999, height: 34, bgcolor: alpha(theme.palette.text.primary, 0.03) } }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>, endAdornment: filtros.busca ? <InputAdornment position="end"><ButtonBase onClick={() => setFiltro('busca', '')} sx={{ borderRadius: '50%', p: 0.25 }}><Close sx={{ fontSize: 16 }} /></ButtonBase></InputAdornment> : null } }}
        />
    );

    if (empilhado) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>Período</Typography>
                    {periodo}
                    {datas && <Box sx={{ mt: 1 }}>{datas}</Box>}
                </Box>
                <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.5 }}>Refinar</Typography>
                    {pilulas}
                </Box>
                {busca}
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                {periodo}
                {datas}
                <Box sx={{ flex: 1 }} />
                {busca}
            </Box>
            {pilulas}
        </Box>
    );
}

