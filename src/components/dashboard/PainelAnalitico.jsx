import { useMemo, useState, useCallback } from 'react';
import {
    Box, Paper, Typography, Chip, Button, IconButton, Tabs, Tab, TextField,
    Tooltip, SwipeableDrawer, Divider, Badge, Skeleton, Alert, alpha, useTheme, useMediaQuery, InputAdornment,
} from '@mui/material';
import {
    Assignment, AssignmentReturn, Inventory2, DirectionsCar, Build, Warehouse, Groups, Timeline, FilterList, Refresh, Download, Close,
    Search, WarningAmber, PauseCircleOutline, EventAvailable, Draw, Speed, ReportProblem, Storage, ClearAll, Insights,
} from '@mui/icons-material';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, LabelList,
} from 'recharts';
import { useMaterials } from '../../contexts/MaterialContext';
import { useLocaisArmazenamento, useAlocacoesLocais } from '../../hooks/useLocais';
import UserAvatar from '../UserAvatar';
import { KpiTile, ChartCard, TooltipGrafico, Vazio, MapaCalor, ListaRanking, TabelaCompacta, Selo } from './PainelWidgets';
import PainelFiltros from './PainelFiltros';
import {
    usePainelDados, calcularPainel, TIPOS_MOV, corTipo, labelTipo, SERIES_CLARO, SERIES_ESCURO, fmtNum, fmtData, fmtDataHora, csvMovimentacoes,
} from './painelUtils';

const FILTROS_INICIAIS = { periodo: '30', inicio: '', fim: '', tipos: [], categoria: '', militar: '', viatura: '', material: '', obm: '', busca: '' };

const ABAS = [
    { key: 'geral', label: 'Visão geral', icon: Insights },
    { key: 'cautelas', label: 'Cautelas', icon: Assignment },
    { key: 'materiais', label: 'Materiais', icon: Inventory2 },
    { key: 'viaturas', label: 'Viaturas', icon: DirectionsCar },
    { key: 'manutencao', label: 'Manutenção', icon: Build },
    { key: 'militares', label: 'Militares', icon: Groups },
    { key: 'locais', label: 'Locais', icon: Warehouse },
];

const eixoTick = (theme) => ({ fontSize: 11, fill: theme.palette.text.secondary });
const grade = (theme) => alpha(theme.palette.text.primary, 0.08);

/* ================================================================== */
export default function PainelAnalitico({ userRole }) {
    const theme = useTheme();
    const escuro = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const SERIES = escuro ? SERIES_ESCURO : SERIES_CLARO;

    const { materials } = useMaterials();
    const { locais } = useLocaisArmazenamento();
    const { porMaterial } = useAlocacoesLocais();
    const dados = usePainelDados();

    const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
    const [aba, setAba] = useState(0);
    const [filtrosAbertos, setFiltrosAbertos] = useState(false);

    const setFiltro = useCallback((chave, valor) => setFiltros(f => ({ ...f, [chave]: valor })), []);
    const alternar = useCallback((chave, valor) => setFiltros(f => ({ ...f, [chave]: f[chave] === valor ? '' : valor })), []);
    const limpar = () => setFiltros(FILTROS_INICIAIS);

    const painel = useMemo(
        () => calcularPainel({ dados, materials, locais, alocacoesPorMaterial: porMaterial, filtros }),
        [dados, materials, locais, porMaterial, filtros]
    );

    // Opcoes dos filtros ---------------------------------------------------
    const categorias = useMemo(() => [...new Set(materials.map(m => m.categoria || 'Sem categoria'))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [materials]);
    const militares = useMemo(() => [...dados.users].filter(u => u.full_name).sort((a, b) => { const na = /^\d/.test(a.full_name) ? 1 : 0; const nb = /^\d/.test(b.full_name) ? 1 : 0; return na - nb || a.full_name.localeCompare(b.full_name, 'pt-BR'); }), [dados.users]);
    const viaturasOpc = useMemo(() => [...dados.viaturas].sort((a, b) => (a.prefixo || '').localeCompare(b.prefixo || '')), [dados.viaturas]);
    const obms = useMemo(() => [...new Set(dados.users.map(u => u.OBM).filter(Boolean))].sort(), [dados.users]);
    const materiaisOpc = useMemo(() => [...materials].sort((a, b) => (a.description || '').localeCompare(b.description || '', 'pt-BR')), [materials]);

    const chipsAtivos = [];
    if (filtros.tipos.length) chipsAtivos.push({ chave: 'tipos', label: `Tipo: ${filtros.tipos.map(labelTipo).join(', ')}`, limpar: () => setFiltro('tipos', []) });
    if (filtros.categoria) chipsAtivos.push({ chave: 'categoria', label: `Categoria: ${filtros.categoria}`, limpar: () => setFiltro('categoria', '') });
    if (filtros.militar) chipsAtivos.push({ chave: 'militar', label: `Militar: ${dados.usersById.get(filtros.militar)?.full_name || '—'}`, limpar: () => setFiltro('militar', '') });
    if (filtros.viatura) chipsAtivos.push({ chave: 'viatura', label: `Viatura: ${dados.viaturasById.get(filtros.viatura)?.prefixo || '—'}`, limpar: () => setFiltro('viatura', '') });
    if (filtros.material) chipsAtivos.push({ chave: 'material', label: `Material: ${materials.find(m => m.id === filtros.material)?.description || '—'}`, limpar: () => setFiltro('material', '') });
    if (filtros.obm) chipsAtivos.push({ chave: 'obm', label: `OBM: ${filtros.obm}`, limpar: () => setFiltro('obm', '') });
    if (filtros.busca) chipsAtivos.push({ chave: 'busca', label: `Busca: ${filtros.busca}`, limpar: () => setFiltro('busca', '') });

    const exportarCsv = () => {
        const csv = csvMovimentacoes(painel.movs, dados.usersById, dados.viaturasById);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `demop-movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    };

    const periodoRotulo = painel.intervalo.inicio ? `${fmtData(painel.intervalo.inicio)} a ${fmtData(painel.intervalo.fim)}` : 'todo o histórico';

    /* ---------------- Controles de filtro ---------------- */
    const propsFiltros = { filtros, setFiltro, categorias, militares, viaturas: viaturasOpc, materiais: materiaisOpc, obms, escuro };
    const controles = <PainelFiltros {...propsFiltros} />;

    const cabecalho = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: '#fff', boxShadow: `0 8px 18px ${alpha(theme.palette.primary.main, 0.35)}` }}>
                <Timeline />
            </Box>
            <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.15rem', sm: '1.4rem' }, lineHeight: 1.1, letterSpacing: '-0.01em' }}>Painel do Depósito</Typography>
                <Typography variant="caption" color="text.secondary">
                    {dados.loading ? 'Carregando dados...' : `${fmtNum(painel.movs.length)} movimentações · ${periodoRotulo}`}
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                {isMobile && (
                    <Badge badgeContent={chipsAtivos.length} color="secondary">
                        <Button size="small" variant="outlined" startIcon={<FilterList />} onClick={() => setFiltrosAbertos(true)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Filtros</Button>
                    </Badge>
                )}
                <Tooltip title="Exportar movimentações filtradas (CSV)"><span><IconButton size="small" onClick={exportarCsv} disabled={dados.loading || painel.movs.length === 0}><Download fontSize="small" /></IconButton></span></Tooltip>
                <Tooltip title="Atualizar dados"><span><IconButton size="small" onClick={dados.recarregar} disabled={dados.loading}><Refresh fontSize="small" /></IconButton></span></Tooltip>
            </Box>
        </Box>
    );

    const barraChips = chipsAtivos.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', mb: 1.5 }}>
            {chipsAtivos.map(c => <Chip key={c.chave} label={c.label} size="small" color="primary" variant="outlined" onDelete={c.limpar} sx={{ fontWeight: 600, maxWidth: 320 }} />)}
            <Chip label="Limpar tudo" size="small" icon={<ClearAll />} onClick={limpar} sx={{ fontWeight: 600 }} />
        </Box>
    );

    const props = { painel, filtros, setFiltro, alternar, dados, theme, escuro, SERIES, isMobile, materials, locais, porMaterial };
    const abaKey = ABAS[aba].key;

    return (
        <Box sx={{ mt: { xs: 1, sm: 2 } }}>
            {cabecalho}

            {!isMobile && (
                <Paper elevation={0} sx={{ px: 2, py: 1.5, mb: 1.5, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 1)}`, position: 'sticky', top: 8, zIndex: 5, bgcolor: alpha(theme.palette.background.paper, 0.92), backdropFilter: 'blur(12px)', boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.06)}` }}>
                    {controles}
                </Paper>
            )}
            {barraChips}

            {dados.erro && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{dados.erro}</Alert>}

            <Tabs
                value={aba}
                onChange={(_, v) => setAba(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ mb: 2, minHeight: 44, borderBottom: `1px solid ${alpha(theme.palette.divider, 1)}`, '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 44, minWidth: 0, px: { xs: 1.25, sm: 2 } } }}
            >
                {ABAS.map((a) => { const Icon = a.icon; return <Tab key={a.key} icon={<Icon sx={{ fontSize: 18 }} />} iconPosition="start" label={a.label} />; })}
            </Tabs>

            {dados.loading ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                    {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} variant="rounded" height={i < 4 ? 96 : 260} sx={{ borderRadius: 3, gridColumn: i >= 4 ? { xs: 'span 2', md: 'span 2' } : 'auto' }} />)}
                </Box>
            ) : (
                <>
                    {abaKey === 'geral' && <AbaGeral {...props} />}
                    {abaKey === 'cautelas' && <AbaCautelas {...props} />}
                    {abaKey === 'materiais' && <AbaMateriais {...props} />}
                    {abaKey === 'viaturas' && <AbaViaturas {...props} />}
                    {abaKey === 'manutencao' && <AbaManutencao {...props} />}
                    {abaKey === 'militares' && <AbaMilitares {...props} />}
                    {abaKey === 'locais' && <AbaLocais {...props} />}
                </>
            )}

            <SwipeableDrawer anchor="bottom" open={isMobile && filtrosAbertos} onClose={() => setFiltrosAbertos(false)} onOpen={() => setFiltrosAbertos(true)} disableSwipeToOpen PaperProps={{ sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88dvh', pb: 'calc(16px + env(safe-area-inset-bottom, 0px))' } }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.25 }}><Box sx={{ width: 40, height: 5, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, 0.18) }} /></Box>
                <Box sx={{ display: 'flex', alignItems: 'center', px: 2.5, py: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, flex: 1 }}>Filtros do painel</Typography>
                    <Button size="small" onClick={limpar} startIcon={<ClearAll />} sx={{ textTransform: 'none' }}>Limpar</Button>
                    <IconButton size="small" onClick={() => setFiltrosAbertos(false)}><Close /></IconButton>
                </Box>
                <Divider />
                <Box sx={{ p: 2, overflowY: 'auto' }}><PainelFiltros {...propsFiltros} empilhado /></Box>
                <Box sx={{ px: 2 }}><Button fullWidth variant="contained" onClick={() => setFiltrosAbertos(false)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Aplicar</Button></Box>
            </SwipeableDrawer>
            {userRole === 'admingeral' && null}
        </Box>
    );
}

/* ================================================================== */
/* Blocos reutilizaveis                                                 */
/* ================================================================== */
const Grade = ({ children, colunas = { xs: 1, md: 2 }, sx }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: `repeat(${colunas.xs || 1}, minmax(0, 1fr))`, sm: `repeat(${colunas.sm || colunas.xs || 1}, minmax(0, 1fr))`, md: `repeat(${colunas.md || 2}, minmax(0, 1fr))`, lg: `repeat(${colunas.lg || colunas.md || 2}, minmax(0, 1fr))` }, gap: { xs: 1.25, sm: 2 }, mb: { xs: 1.25, sm: 2 }, ...sx }}>
        {children}
    </Box>
);

function Donut({ dados, cores, total, rotuloCentro, onClick, ativoChave, theme, altura = 230 }) {
    if (!dados || dados.length === 0) return <Vazio altura={altura} />;
    const soma = total ?? dados.reduce((s, d) => s + d.valor, 0);
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: { xs: 'column', sm: 'row' }, height: '100%' }}>
            <Box sx={{ width: { xs: '100%', sm: '46%' }, height: altura, position: 'relative', minWidth: 0, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke={theme.palette.background.paper} strokeWidth={2} onClick={onClick ? (d) => onClick(d) : undefined} cursor={onClick ? 'pointer' : 'default'}>
                            {dados.map((d, i) => <Cell key={d.chave ?? i} fill={cores[i % cores.length]} opacity={ativoChave && d.chave !== ativoChave ? 0.35 : 1} />)}
                        </Pie>
                        <RTooltip content={<TooltipGrafico />} />
                    </PieChart>
                </ResponsiveContainer>
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <Typography sx={{ fontWeight: 900, fontSize: '1.4rem', lineHeight: 1 }}>{fmtNum(soma)}</Typography>
                    <Typography variant="caption" color="text.secondary">{rotuloCentro}</Typography>
                </Box>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {dados.slice(0, 8).map((d, i) => (
                    <Box key={d.chave ?? i} onClick={onClick ? () => onClick(d) : undefined} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: onClick ? 'pointer' : 'default', opacity: ativoChave && d.chave !== ativoChave ? 0.5 : 1, p: 0.25, borderRadius: 1, '&:hover': onClick ? { bgcolor: alpha(theme.palette.text.primary, 0.05) } : {} }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: cores[i % cores.length], flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ flex: 1, minWidth: 0, fontWeight: 600, lineHeight: 1.2, overflowWrap: 'anywhere' }}>{d.nome}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800 }}>{fmtNum(d.valor)}</Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ width: 36, textAlign: 'right' }}>{soma ? Math.round((d.valor / soma) * 100) : 0}%</Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

function BarrasHorizontais({ dados, cor, onClick, ativoChave, theme, altura = 260, chaveValor = 'valor', chaveNome = 'nome' }) {
    if (!dados || dados.length === 0) return <Vazio altura={altura} />;
    const h = Math.max(altura, dados.length * 30 + 20);
    return (
        <ResponsiveContainer width="100%" height={h}>
            <BarChart data={dados} layout="vertical" margin={{ left: 4, right: 36, top: 4, bottom: 4 }} barCategoryGap={6}>
                <CartesianGrid horizontal={false} stroke={grade(theme)} />
                <XAxis type="number" tick={eixoTick(theme)} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey={chaveNome} width={130} tick={{ ...eixoTick(theme), width: 125 }} axisLine={false} tickLine={false} tickFormatter={(v) => (String(v).length > 20 ? `${String(v).slice(0, 19)}…` : v)} />
                <RTooltip content={<TooltipGrafico />} cursor={{ fill: alpha(theme.palette.text.primary, 0.04) }} />
                <Bar dataKey={chaveValor} name="Quantidade" radius={[0, 4, 4, 0]} maxBarSize={22} onClick={onClick ? (d) => onClick(d) : undefined} cursor={onClick ? 'pointer' : 'default'}>
                    {dados.map((d, i) => <Cell key={d.chave ?? i} fill={cor} opacity={ativoChave && d.chave !== ativoChave ? 0.35 : 1} />)}
                    <LabelList dataKey={chaveValor} position="right" style={{ fontSize: 11, fill: theme.palette.text.secondary, fontWeight: 700 }} formatter={fmtNum} />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

/* ================================================================== */
/* ABA: Visao geral                                                      */
/* ================================================================== */
function AbaGeral({ painel, filtros, setFiltro, alternar, theme, escuro, SERIES, dados }) {
    const k = painel.kpis;
    const tiposPresentes = TIPOS_MOV.filter(t => painel.serie.pontos.some(p => p[t.key]));
    const tempoMedioTxt = k.tempoMedio ? `${k.tempoMedio.toFixed(1)}` : '0';
    return (
        <>
            <Grade colunas={{ xs: 2, sm: 3, md: 4, lg: 6 }}>
                <KpiTile titulo="Movimentações" valor={k.movimentacoes.valor} anterior={k.movimentacoes.anterior} icon={Timeline} ajuda="no período" />
                <KpiTile titulo="Cautelas feitas" valor={k.cautelas.valor} anterior={k.cautelas.anterior} icon={Assignment} cor={SERIES[0]} ajuda="no período" />
                <KpiTile titulo="Devoluções" valor={k.devolucoes.valor} anterior={k.devolucoes.anterior} icon={AssignmentReturn} cor={SERIES[2]} ajuda="no período" />
                <KpiTile titulo="Cautelas em aberto" valor={k.abertas} icon={Draw} cor={SERIES[3]} ajuda={`${k.pendentesAssinatura} sem assinatura`} onClick={() => setFiltro('tipos', ['cautela'])} />
                <KpiTile titulo="Inoperantes" valor={k.emReparo} icon={ReportProblem} cor={SERIES[7]} ajuda={`${fmtNum(k.unidadesEmReparo)} unidades`} onClick={() => setFiltro('tipos', ['reparo'])} />
                <KpiTile titulo="Tempo médio de devolução" valor={tempoMedioTxt} sufixo="dias" formato={(v) => v} icon={Speed} cor={SERIES[6]} ajuda="cautelas devolvidas no período" />
            </Grade>

            <Grade colunas={{ xs: 1, md: 3 }}>
                <ChartCard titulo="Movimentações ao longo do tempo" subtitulo={`Por ${painel.serie.gran === 'dia' ? 'dia' : painel.serie.gran === 'semana' ? 'semana' : 'mês'}, empilhadas por tipo`} sx={{ gridColumn: { md: 'span 2' } }} altura={280}>
                    {painel.serie.pontos.length === 0 || painel.movs.length === 0 ? <Vazio altura={280} /> : (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={painel.serie.pontos} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                                <defs>
                                    {tiposPresentes.map(t => (
                                        <linearGradient key={t.key} id={`grad-${t.key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={corTipo(t.key, escuro)} stopOpacity={0.45} />
                                            <stop offset="100%" stopColor={corTipo(t.key, escuro)} stopOpacity={0.05} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid vertical={false} stroke={grade(theme)} />
                                <XAxis dataKey="rotulo" tick={eixoTick(theme)} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                                <YAxis tick={eixoTick(theme)} axisLine={false} tickLine={false} allowDecimals={false} />
                                <RTooltip content={<TooltipGrafico />} />
                                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                {tiposPresentes.map(t => (
                                    <Area key={t.key} type="monotone" dataKey={t.key} name={t.label} stackId="1" stroke={corTipo(t.key, escuro)} strokeWidth={2} fill={`url(#grad-${t.key})`} dot={false} activeDot={{ r: 4 }} />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
                <ChartCard titulo="Composição por tipo" subtitulo="Clique para filtrar" altura={230}>
                    <Donut theme={theme} dados={painel.porTipo} cores={painel.porTipo.map(d => corTipo(d.chave, escuro))} rotuloCentro="movimentações" onClick={(d) => setFiltro('tipos', filtros.tipos.length === 1 && filtros.tipos[0] === d.chave ? [] : [d.chave])} ativoChave={filtros.tipos.length === 1 ? filtros.tipos[0] : null} />
                </ChartCard>
            </Grade>

            <Grade colunas={{ xs: 1, md: 3 }}>
                <ChartCard titulo="Materiais mais cautelados" subtitulo="Unidades cauteladas no período · clique para filtrar" altura={280}>
                    <ListaRanking itens={painel.topMateriais} cor={SERIES[0]} onClick={(i) => alternar('material', i.chave)} ativoChave={filtros.material} sufixo=" un." vazio="Nenhuma cautela no período" />
                </ChartCard>
                <ChartCard titulo="Militares que mais cautelaram" subtitulo="Cautelas no período · clique para filtrar" altura={280}>
                    <ListaRanking itens={painel.topMilitares} cor={SERIES[6]} onClick={(i) => alternar('militar', i.chave)} ativoChave={filtros.militar} vazio="Nenhuma cautela no período" avatar={(i) => <UserAvatar src={dados.usersById.get(i.chave)?.foto_url} name={i.nome} role={dados.usersById.get(i.chave)?.role} size={24} />} />
                </ChartCard>
                <ChartCard titulo="Por categoria" subtitulo="Movimentações · clique para filtrar" altura={280}>
                    <BarrasHorizontais theme={theme} dados={painel.porCategoria.slice(0, 10)} cor={SERIES[2]} onClick={(d) => alternar('categoria', d.chave)} ativoChave={filtros.categoria} altura={280} />
                </ChartCard>
            </Grade>

            <Grade colunas={{ xs: 1, md: 3 }}>
                <ChartCard titulo="Quando o depósito é mais movimentado" subtitulo="Dia da semana × hora do dia" altura={200}>
                    <MapaCalor matriz={painel.calor} maximo={painel.calorMax} cor={SERIES[0]} />
                </ChartCard>
                <ChartCard titulo="Viaturas mais apoiadas pelo DEMOP" subtitulo="Unidades enviadas/trocadas · clique para filtrar" altura={200}>
                    <ListaRanking itens={painel.topViaturas} cor={SERIES[1]} onClick={(i) => alternar('viatura', i.chave)} ativoChave={filtros.viatura} sufixo=" un." vazio="Nenhuma movimentação com viatura" maxItens={6} />
                </ChartCard>
                <ChartCard titulo="Últimas movimentações" subtitulo="Mais recentes dentro do filtro" altura={200}>
                    <TabelaCompacta
                        maxAltura={260}
                        colunas={[
                            { chave: 'data', titulo: 'Quando', render: (l) => <Typography variant="caption" sx={{ fontWeight: 600 }}>{fmtDataHora(l.data)}</Typography> },
                            { chave: 'tipo', titulo: 'Tipo', render: (l) => <Selo texto={l.tipoLabel} cor={corTipo(l.tipo, escuro)} /> },
                            { chave: 'material', titulo: 'Material', largura: 200 },
                            { chave: 'militar', titulo: 'Militar / Viatura', render: (l) => l.viatura || l.militar },
                            { chave: 'quantidade', titulo: 'Qtd', alinhar: 'right' },
                        ]}
                        linhas={painel.recentes}
                    />
                </ChartCard>
            </Grade>
        </>
    );
}

/* ================================================================== */
/* ABA: Cautelas                                                         */
/* ================================================================== */
function AbaCautelas({ painel, filtros, alternar, theme, SERIES, dados }) {
    const k = painel.kpis;
    return (
        <>
            <Grade colunas={{ xs: 2, sm: 3, md: 5 }}>
                <KpiTile titulo="Cautelas no período" valor={k.cautelas.valor} anterior={k.cautelas.anterior} icon={Assignment} cor={SERIES[0]} />
                <KpiTile titulo="Devolvidas no período" valor={k.devolucoes.valor} anterior={k.devolucoes.anterior} icon={AssignmentReturn} cor={SERIES[2]} />
                <KpiTile titulo="Em aberto agora" valor={k.abertas} icon={Draw} cor={SERIES[3]} ajuda="independente do período" />
                <KpiTile titulo="Sem assinatura" valor={k.pendentesAssinatura} icon={WarningAmber} cor={SERIES[7]} ajuda="militar ainda não assinou" />
                <KpiTile titulo="Tempo médio" valor={k.tempoMedio ? k.tempoMedio.toFixed(1) : '0'} sufixo="dias" formato={(v) => v} icon={Speed} cor={SERIES[6]} ajuda="até a devolução" />
            </Grade>
            <Grade colunas={{ xs: 1, md: 3 }}>
                <ChartCard titulo="Funil das cautelas" subtitulo="Feitas → assinadas → devolvidas (no período)" altura={220}>
                    <BarrasHorizontais theme={theme} dados={painel.funil} cor={SERIES[0]} altura={200} />
                </ChartCard>
                <ChartCard titulo="Tempo até a devolução" subtitulo="Cautelas devolvidas no período, por faixa" altura={220}>
                    {painel.histDuracao.every(h => h.valor === 0) ? <Vazio altura={200} /> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={painel.histDuracao} margin={{ left: -20, right: 8, top: 16, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke={grade(theme)} />
                                <XAxis dataKey="nome" tick={eixoTick(theme)} axisLine={false} tickLine={false} interval={0} />
                                <YAxis tick={eixoTick(theme)} axisLine={false} tickLine={false} allowDecimals={false} />
                                <RTooltip content={<TooltipGrafico />} cursor={{ fill: alpha(theme.palette.text.primary, 0.04) }} />
                                <Bar dataKey="valor" name="Cautelas" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={40}>
                                    <LabelList dataKey="valor" position="top" style={{ fontSize: 11, fill: theme.palette.text.secondary, fontWeight: 700 }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
                <ChartCard titulo="Quem tem mais material em aberto" subtitulo="Cautelas ainda não devolvidas · clique para filtrar" altura={220}>
                    <ListaRanking itens={painel.abertasPorMilitar} cor={SERIES[3]} onClick={(i) => alternar('militar', i.chave)} ativoChave={filtros.militar} maxItens={8} avatar={(i) => <UserAvatar src={dados.usersById.get(i.chave)?.foto_url} name={i.nome} role={dados.usersById.get(i.chave)?.role} size={24} />} />
                </ChartCard>
            </Grade>
            <ChartCard titulo="Cautelas em aberto" subtitulo={`${painel.abertasDetalhe.length} registro(s) · ordenadas da mais antiga para a mais recente`} altura={100} sx={{ mb: 2 }}>
                <TabelaCompacta
                    maxAltura={420}
                    colunas={[
                        { chave: 'militar', titulo: 'Militar', render: (l) => <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><UserAvatar src={dados.usersById.get(l.militarId)?.foto_url} name={l.militar} role={dados.usersById.get(l.militarId)?.role} size={22} /><span>{l.militar}</span></Box> },
                        { chave: 'material', titulo: 'Material', largura: 240 },
                        { chave: 'quantidade', titulo: 'Qtd', alinhar: 'right' },
                        { chave: 'data', titulo: 'Cautelado em', render: (l) => fmtData(l.data) },
                        { chave: 'dias', titulo: 'Dias', alinhar: 'right', render: (l) => <Selo texto={`${l.dias} d`} cor={l.dias > 30 ? 'error' : l.dias > 15 ? 'warning' : 'success'} /> },
                        { chave: 'assinada', titulo: 'Assinatura', render: (l) => <Selo texto={l.assinada ? 'Assinada' : 'Pendente'} cor={l.assinada ? 'success' : 'warning'} /> },
                    ]}
                    linhas={painel.abertasDetalhe}
                    vazio="Nenhuma cautela em aberto"
                />
            </ChartCard>
        </>
    );
}

/* ================================================================== */
/* ABA: Materiais                                                        */
/* ================================================================== */
function AbaMateriais({ painel, filtros, alternar, theme, SERIES, isMobile }) {
    const e = painel.kpis.estoque;
    const composicao = [
        { chave: 'disponivel', nome: 'Disponível no DEMOP', valor: e.disponivel },
        { chave: 'viatura', nome: 'Em viaturas', valor: e.viatura },
        { chave: 'inoperante', nome: 'Inoperantes', valor: e.inoperante },
    ];
    const coresComp = [SERIES[2], SERIES[0], SERIES[7]];
    const coresStatus = painel.statusMateriais.map(s => ({ operante: theme.palette.success.main, parcialmente_inoperante: theme.palette.warning.main, em_manutencao: theme.palette.info.main, inoperante: theme.palette.error.main }[s.chave] || SERIES[4]));
    return (
        <>
            <Grade colunas={{ xs: 2, sm: 3, md: 6 }}>
                <KpiTile titulo="Materiais" valor={painel.kpis.materiais} icon={Inventory2} ajuda={filtros.categoria || 'todas as categorias'} />
                <KpiTile titulo="Unidades no total" valor={e.total} icon={Storage} cor={SERIES[6]} />
                <KpiTile titulo="Disponíveis" valor={e.disponivel} icon={Inventory2} cor={SERIES[2]} ajuda="no DEMOP" />
                <KpiTile titulo="Em viaturas" valor={e.viatura} icon={DirectionsCar} cor={SERIES[0]} />
                <KpiTile titulo="Inoperantes" valor={e.inoperante} icon={ReportProblem} cor={SERIES[7]} />
                <KpiTile titulo="Estoque zerado" valor={painel.estoqueZerado.length} icon={WarningAmber} cor={SERIES[3]} ajuda="materiais sem unidade disponível" />
            </Grade>
            <Grade colunas={{ xs: 1, md: 2 }}>
                <ChartCard titulo="Composição do estoque" subtitulo="Onde estão as unidades" altura={230}>
                    <Donut theme={theme} dados={composicao} cores={coresComp} rotuloCentro="unidades" />
                </ChartCard>
                <ChartCard titulo="Status operacional" subtitulo="Materiais por situação" altura={230}>
                    <Donut theme={theme} dados={painel.statusMateriais} cores={coresStatus} rotuloCentro="materiais" />
                </ChartCard>
            </Grade>
            <ChartCard titulo="Estoque por categoria" subtitulo="Disponível, em viatura e inoperante · clique na categoria para filtrar" altura={320} sx={{ mb: 2 }}>
                {painel.estoquePorCategoria.length === 0 ? <Vazio /> : (
                    <ResponsiveContainer width="100%" height={Math.max(320, painel.estoquePorCategoria.length * 34)}>
                        <BarChart data={painel.estoquePorCategoria} layout="vertical" margin={{ left: 4, right: 24, top: 4, bottom: 4 }} barCategoryGap={8}>
                            <CartesianGrid horizontal={false} stroke={grade(theme)} />
                            <XAxis type="number" tick={eixoTick(theme)} axisLine={false} tickLine={false} allowDecimals={false} />
                            <YAxis type="category" dataKey="nome" width={isMobile ? 110 : 160} tick={{ ...eixoTick(theme) }} axisLine={false} tickLine={false} tickFormatter={(v) => (String(v).length > 22 ? `${String(v).slice(0, 21)}…` : v)} />
                            <RTooltip content={<TooltipGrafico />} cursor={{ fill: alpha(theme.palette.text.primary, 0.04) }} />
                            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="disponivel" name="Disponível" stackId="a" fill={SERIES[2]} maxBarSize={22} onClick={(d) => alternar('categoria', d.nome)} cursor="pointer" stroke={theme.palette.background.paper} strokeWidth={1} />
                            <Bar dataKey="viatura" name="Em viatura" stackId="a" fill={SERIES[0]} maxBarSize={22} onClick={(d) => alternar('categoria', d.nome)} cursor="pointer" stroke={theme.palette.background.paper} strokeWidth={1} />
                            <Bar dataKey="inoperante" name="Inoperante" stackId="a" fill={SERIES[7]} maxBarSize={22} radius={[0, 4, 4, 0]} onClick={(d) => alternar('categoria', d.nome)} cursor="pointer" stroke={theme.palette.background.paper} strokeWidth={1} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </ChartCard>
            <Grade colunas={{ xs: 1, md: 3 }}>
                <ChartCard titulo="Mais movimentados" subtitulo="Registros no período · clique para filtrar" altura={240}>
                    <ListaRanking itens={painel.materiaisMaisMovimentados} cor={SERIES[0]} onClick={(i) => alternar('material', i.chave)} ativoChave={filtros.material} />
                </ChartCard>
                <ChartCard titulo="Estoque zerado" subtitulo={`${painel.estoqueZerado.length} materiais sem unidade disponível`} altura={240}>
                    <TabelaCompacta maxAltura={260} colunas={[{ chave: 'description', titulo: 'Material', largura: 220 }, { chave: 'categoria', titulo: 'Categoria' }, { chave: 'estoque_viatura', titulo: 'Em viatura', alinhar: 'right', render: (l) => l.estoque_viatura || 0 }]} linhas={painel.estoqueZerado} vazio="Nenhum material zerado" />
                </ChartCard>
                <ChartCard titulo="Sem conferência há +6 meses" subtitulo={`${painel.semConferencia.length} materiais precisam de revisão`} altura={240}>
                    <TabelaCompacta maxAltura={260} colunas={[{ chave: 'description', titulo: 'Material', largura: 220 }, { chave: 'categoria', titulo: 'Categoria' }]} linhas={painel.semConferencia} vazio="Todos conferidos recentemente" />
                </ChartCard>
            </Grade>
        </>
    );
}

/* ================================================================== */
/* ABA: Viaturas                                                         */
/* ================================================================== */
function AbaViaturas({ painel, filtros, alternar, theme, SERIES }) {
    const vs = painel.viaturasResumo;
    const totalUnidades = vs.reduce((s, v) => s + v.unidades, 0);
    const semConf = vs.filter(v => v.diasConferencia === null || v.diasConferencia > 30).length;
    return (
        <>
            <Grade colunas={{ xs: 2, md: 4 }}>
                <KpiTile titulo="Viaturas" valor={vs.length} icon={DirectionsCar} cor={SERIES[0]} />
                <KpiTile titulo="Unidades embarcadas" valor={totalUnidades} icon={Inventory2} cor={SERIES[2]} ajuda="materiais alocados em viaturas" />
                <KpiTile titulo="Conferência vencida" valor={semConf} icon={WarningAmber} cor={SERIES[7]} ajuda="mais de 30 dias ou nunca" />
                <KpiTile titulo="Movimentações c/ viatura" valor={painel.topViaturas.reduce((s, v) => s + v.valor, 0)} icon={Timeline} cor={SERIES[1]} ajuda="unidades no período" />
            </Grade>
            <Grade colunas={{ xs: 1, md: 2 }}>
                <ChartCard titulo="Unidades por viatura" subtitulo="Materiais embarcados hoje · clique para filtrar" altura={300}>
                    <BarrasHorizontais theme={theme} dados={vs.slice(0, 15).map(v => ({ chave: v.id, nome: v.nome, valor: v.unidades }))} cor={SERIES[0]} onClick={(d) => alternar('viatura', d.chave)} ativoChave={filtros.viatura} altura={300} />
                </ChartCard>
                <ChartCard titulo="Situação das conferências" subtitulo="Dias desde a última conferência de cada viatura" altura={300}>
                    <TabelaCompacta
                        maxAltura={330}
                        onLinha={(l) => alternar('viatura', l.id)}
                        colunas={[
                            { chave: 'nome', titulo: 'Viatura', largura: 220 },
                            { chave: 'itens', titulo: 'Itens', alinhar: 'right' },
                            { chave: 'unidades', titulo: 'Unid.', alinhar: 'right' },
                            { chave: 'ultimaConferencia', titulo: 'Última conferência', render: (l) => fmtData(l.ultimaConferencia) },
                            { chave: 'diasConferencia', titulo: 'Situação', render: (l) => l.diasConferencia === null ? <Selo texto="Nunca" cor="error" /> : l.diasConferencia > 30 ? <Selo texto={`${l.diasConferencia} d`} cor="error" /> : l.diasConferencia > 15 ? <Selo texto={`${l.diasConferencia} d`} cor="warning" /> : <Selo texto={`${l.diasConferencia} d`} cor="success" /> },
                        ]}
                        linhas={vs}
                    />
                </ChartCard>
            </Grade>
        </>
    );
}

/* ================================================================== */
/* ABA: Manutencao                                                       */
/* ================================================================== */
function AbaManutencao({ painel, theme, SERIES }) {
    return (
        <>
            <Grade colunas={{ xs: 2, sm: 3, md: 5 }}>
                <KpiTile titulo="Em aberto" valor={painel.manAbertas.length} icon={Build} cor={SERIES[6]} />
                <KpiTile titulo="Atrasadas" valor={painel.manAtrasadas.length} icon={WarningAmber} cor={SERIES[7]} />
                <KpiTile titulo="Próximos 30 dias" valor={painel.manProximas.length} icon={EventAvailable} cor={SERIES[3]} />
                <KpiTile titulo="Pausadas" valor={painel.manPausadas.length} icon={PauseCircleOutline} ajuda="material inoperante" />
                <KpiTile titulo="Concluídas no período" valor={painel.concluidasPeriodo.length} icon={AssignmentReturn} cor={SERIES[2]} />
            </Grade>
            <Grade colunas={{ xs: 1, md: 3 }}>
                <ChartCard titulo="Agendadas × concluídas" subtitulo="Últimos 12 meses" sx={{ gridColumn: { md: 'span 2' } }} altura={260}>
                    {painel.manPorMes.length === 0 ? <Vazio /> : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={painel.manPorMes} margin={{ left: -20, right: 8, top: 8, bottom: 0 }} barGap={2}>
                                <CartesianGrid vertical={false} stroke={grade(theme)} />
                                <XAxis dataKey="rotulo" tick={eixoTick(theme)} axisLine={false} tickLine={false} />
                                <YAxis tick={eixoTick(theme)} axisLine={false} tickLine={false} allowDecimals={false} />
                                <RTooltip content={<TooltipGrafico />} cursor={{ fill: alpha(theme.palette.text.primary, 0.04) }} />
                                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="agendadas" name="Agendadas" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                                <Bar dataKey="concluidas" name="Concluídas" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
                <ChartCard titulo="Em aberto por tipo" altura={260}>
                    <ListaRanking itens={painel.manPorTipo} cor={SERIES[6]} vazio="Nenhuma manutenção em aberto" />
                </ChartCard>
            </Grade>
            <Grade colunas={{ xs: 1, md: 3 }}>
                <ChartCard titulo="Atrasadas" subtitulo={`${painel.manAtrasadas.length} manutenções passaram da data`} altura={240}>
                    <TabelaCompacta maxAltura={280} colunas={[{ chave: 'materialDescription', titulo: 'Material', largura: 200 }, { chave: 'type', titulo: 'Tipo' }, { chave: 'dueDate', titulo: 'Prevista', render: (l) => <Selo texto={fmtData(l.dueDate?.toDate?.() || null)} cor="error" /> }]} linhas={painel.manAtrasadas} vazio="Nenhuma atrasada" />
                </ChartCard>
                <ChartCard titulo="Próximos 30 dias" altura={240}>
                    <TabelaCompacta maxAltura={280} colunas={[{ chave: 'materialDescription', titulo: 'Material', largura: 200 }, { chave: 'type', titulo: 'Tipo' }, { chave: 'dueDate', titulo: 'Prevista', render: (l) => fmtData(l.dueDate?.toDate?.() || null) }]} linhas={painel.manProximas} vazio="Nada previsto" />
                </ChartCard>
                <ChartCard titulo="Materiais que mais exigem manutenção" subtitulo="Histórico de conclusões" altura={240}>
                    <ListaRanking itens={painel.materiaisComMaisManutencao} cor={SERIES[1]} vazio="Sem histórico" />
                </ChartCard>
            </Grade>
        </>
    );
}

/* ================================================================== */
/* ABA: Militares                                                        */
/* ================================================================== */
function AbaMilitares({ painel, filtros, alternar, theme, SERIES, dados }) {
    const [busca, setBusca] = useState('');
    const lista = painel.militares.filter(m => !busca || m.nome.toLowerCase().includes(busca.toLowerCase()) || (m.obm || '').toLowerCase().includes(busca.toLowerCase()));
    const comAtraso = painel.militares.filter(m => m.atrasadas > 0).length;
    return (
        <>
            <Grade colunas={{ xs: 2, md: 4 }}>
                <KpiTile titulo="Militares com cautela" valor={painel.militares.length} icon={Groups} cor={SERIES[6]} ajuda="no histórico filtrado" />
                <KpiTile titulo="Com material em aberto" valor={painel.militares.filter(m => m.abertas > 0).length} icon={Draw} cor={SERIES[3]} />
                <KpiTile titulo="Com atraso (+30 dias)" valor={comAtraso} icon={WarningAmber} cor={SERIES[7]} />
                <KpiTile titulo="OBMs atendidas" valor={painel.porOBM.length} icon={Warehouse} cor={SERIES[0]} ajuda="no período" />
            </Grade>
            <Grade colunas={{ xs: 1, md: 3 }}>
                <ChartCard titulo="Cautelas por OBM" subtitulo="No período" altura={230}>
                    <Donut theme={theme} dados={painel.porOBM} cores={SERIES} rotuloCentro="cautelas" />
                </ChartCard>
                <ChartCard titulo="Ranking de militares" subtitulo={`${lista.length} militares · clique para filtrar todo o painel`} sx={{ gridColumn: { md: 'span 2' } }} altura={100}
                    acao={<TextField size="small" placeholder="Buscar nome ou OBM" value={busca} onChange={(e) => setBusca(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }} sx={{ width: { xs: 150, sm: 220 } }} />}
                >
                    <TabelaCompacta
                        maxAltura={480}
                        onLinha={(l) => alternar('militar', l.id)}
                        colunas={[
                            { chave: 'nome', titulo: 'Militar', largura: 240, render: (l) => <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: filtros.militar === l.id ? 800 : 500 }}><UserAvatar src={l.foto} name={l.nome} role={dados.usersById.get(l.id)?.role} size={24} /><span>{l.nome}</span></Box> },
                            { chave: 'obm', titulo: 'OBM' },
                            { chave: 'periodo', titulo: 'Cautelas no período', alinhar: 'right' },
                            { chave: 'total', titulo: 'Total histórico', alinhar: 'right' },
                            { chave: 'abertas', titulo: 'Em aberto', alinhar: 'right', render: (l) => l.abertas > 0 ? <Selo texto={l.abertas} cor={l.atrasadas > 0 ? 'error' : 'warning'} /> : '0' },
                            { chave: 'tempoMedio', titulo: 'Tempo médio', alinhar: 'right', render: (l) => l.tempoMedio === null ? '—' : `${l.tempoMedio.toFixed(1)} d` },
                            { chave: 'ultima', titulo: 'Última cautela', render: (l) => fmtData(l.ultima) },
                        ]}
                        linhas={lista}
                        vazio="Nenhum militar encontrado"
                    />
                </ChartCard>
            </Grade>
        </>
    );
}

/* ================================================================== */
/* ABA: Locais                                                           */
/* ================================================================== */
function AbaLocais({ painel, theme, SERIES }) {
    const ocupados = painel.unidadesPorLocal.filter(l => l.unidades > 0);
    const totalGuardado = ocupados.reduce((s, l) => s + l.unidades, 0);
    return (
        <>
            <Grade colunas={{ xs: 2, md: 4 }}>
                <KpiTile titulo="Locais cadastrados" valor={painel.unidadesPorLocal.length} icon={Warehouse} />
                <KpiTile titulo="Locais em uso" valor={ocupados.length} icon={Storage} cor={SERIES[2]} />
                <KpiTile titulo="Unidades guardadas" valor={totalGuardado} icon={Inventory2} cor={SERIES[0]} />
                <KpiTile titulo="Unidades sem local" valor={painel.kpis.totalSemLocal} icon={WarningAmber} cor={SERIES[3]} ajuda={`${painel.semLocal.length} materiais`} />
            </Grade>
            <Grade colunas={{ xs: 1, md: 3 }}>
                <ChartCard titulo="Por tipo de local" subtitulo="Unidades guardadas" altura={230}>
                    <Donut theme={theme} dados={painel.unidadesPorTipoLocal} cores={SERIES} rotuloCentro="unidades" />
                </ChartCard>
                <ChartCard titulo="Locais mais ocupados" subtitulo="Unidades por local" sx={{ gridColumn: { md: 'span 2' } }} altura={300}>
                    <BarrasHorizontais theme={theme} dados={[...ocupados].sort((a, b) => b.unidades - a.unidades).slice(0, 15).map(l => ({ chave: l.id, nome: l.nome + (l.inoperantes ? ' (inoperantes)' : ''), valor: l.unidades }))} cor={SERIES[2]} altura={300} />
                </ChartCard>
            </Grade>
            <ChartCard titulo="Materiais sem local definido" subtitulo="Unidades do DEMOP ainda não guardadas em prateleira, box, gaveta ou armário" altura={100} sx={{ mb: 2 }}>
                <TabelaCompacta maxAltura={360} colunas={[{ chave: 'description', titulo: 'Material', largura: 240, render: (l) => l.m.description }, { chave: 'categoria', titulo: 'Categoria', render: (l) => l.m.categoria || '—' }, { chave: 'demop', titulo: 'No DEMOP', alinhar: 'right', render: (l) => l.r.unidadesDemop }, { chave: 'semLocal', titulo: 'Sem local', alinhar: 'right', render: (l) => <Selo texto={l.r.semLocal} cor="warning" /> }]} linhas={painel.semLocal.map((x, i) => ({ id: x.m.id || i, ...x }))} vazio="Todos os materiais têm local" />
            </ChartCard>
        </>
    );
}
