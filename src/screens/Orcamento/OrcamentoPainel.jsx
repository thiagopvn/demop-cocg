import { useMemo, useState } from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Typography, alpha, useMediaQuery, useTheme } from '@mui/material';
import { AccountBalanceWallet, Paid, ReceiptLong, Savings, Add } from '@mui/icons-material';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, KpiTile, ListaRanking, TabelaCompacta, TooltipGrafico, Vazio } from '../../components/dashboard/PainelWidgets';
import { SERIES_CLARO, SERIES_ESCURO } from '../../components/dashboard/painelUtils';
import {
    agruparPor,
    anosDisponiveis,
    chaveMes,
    efeitoNoCaixa,
    fmtData,
    fmtMoeda,
    fmtMoedaCurta,
    formatarCnpj,
    rotuloMes,
} from '../../services/orcamentoService';

const NAO_INFORMADO = 'NÃO INFORMADO';
const OUTROS = 'OUTROS';
const MAX_FATIAS = 7;

const eixoTick = (theme) => ({ fontSize: 11, fill: theme.palette.text.secondary });
const grade = (theme) => alpha(theme.palette.text.primary, 0.08);

const Grade = ({ children, colunas = { xs: 1, md: 2 }, sx }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: `repeat(${colunas.xs || 1}, minmax(0, 1fr))`, sm: `repeat(${colunas.sm || colunas.xs || 1}, minmax(0, 1fr))`, md: `repeat(${colunas.md || 2}, minmax(0, 1fr))`, lg: `repeat(${colunas.lg || colunas.md || 2}, minmax(0, 1fr))` }, gap: { xs: 1.25, sm: 2 }, mb: { xs: 1.25, sm: 2 }, ...sx }}>
        {children}
    </Box>
);

/**
 * Painel do Orçamento GOCG: quanto foi gasto, onde (setor), com quem (fornecedor) e por quem (militar).
 * Tudo é calculado a partir das notas e dos movimentos já carregados — cada nota lançada entra na hora.
 */
export default function OrcamentoPainel({ notas, movimentos, setores, saldoCaixa, loading, onNovaNota }) {
    const theme = useTheme();
    const escuro = theme.palette.mode === 'dark';
    const estreito = useMediaQuery(theme.breakpoints.down('sm'));
    const paleta = escuro ? SERIES_ESCURO : SERIES_CLARO;

    const anos = useMemo(() => anosDisponiveis(notas, movimentos), [notas, movimentos]);
    const [ano, setAno] = useState(String(new Date().getFullYear()));
    const [setor, setSetor] = useState('todos');

    // Cor fixa por setor (segue a ordem da lista de setores, não o ranking do período).
    const corDoSetor = useMemo(() => {
        const mapa = new Map();
        setores.forEach((s, i) => mapa.set(s.nome, paleta[i % paleta.length]));
        return (nome) => (nome === NAO_INFORMADO || nome === OUTROS ? alpha(theme.palette.text.secondary, 0.55) : mapa.get(nome) || paleta[(setores.length + 1) % paleta.length]);
    }, [setores, paleta, theme.palette.text.secondary]);

    const dados = useMemo(() => {
        const anoNum = ano === 'todos' ? null : Number(ano);
        const filtroAno = (x) => anoNum === null || Number(x.ano) === anoNum;
        const notasAno = notas.filter(filtroAno);
        const notasPeriodo = setor === 'todos' ? notasAno : notasAno.filter((n) => (n.setor || NAO_INFORMADO) === setor);
        const movsAno = movimentos.filter(filtroAno);

        const gasto = notasPeriodo.reduce((s, n) => s + (Number(n.valor) || 0), 0);
        const sacado = movsAno.filter((m) => m.tipo === 'saque').reduce((s, m) => s + (Number(m.valor) || 0), 0);

        // Série mensal: gasto (notas do filtro) e sacado (saques do ano, sem filtro de setor)
        const meses = new Map();
        const garantir = (a, m) => {
            const k = chaveMes(a, m);
            if (!meses.has(k)) meses.set(k, { chave: k, rotulo: rotuloMes(a, m), gasto: 0, sacado: 0 });
            return meses.get(k);
        };
        if (anoNum !== null) for (let m = 1; m <= 12; m++) garantir(anoNum, m);
        notasPeriodo.forEach((n) => { if (n.ano && n.mes) garantir(n.ano, n.mes).gasto += Number(n.valor) || 0; });
        movsAno.forEach((m) => { if (m.tipo === 'saque' && m.ano && m.mes) garantir(m.ano, m.mes).sacado += Number(m.valor) || 0; });
        const porMes = [...meses.values()].sort((a, b) => a.chave.localeCompare(b.chave));

        // Setores: fatias limitadas; o resto vira "OUTROS"
        const porSetorTodos = agruparPor(notasAno, (n) => n.setor || NAO_INFORMADO);
        let porSetor = porSetorTodos;
        if (porSetorTodos.length > MAX_FATIAS) {
            const topo = porSetorTodos.slice(0, MAX_FATIAS - 1);
            const resto = porSetorTodos.slice(MAX_FATIAS - 1);
            porSetor = [...topo, { chave: OUTROS, nome: OUTROS, valor: resto.reduce((s, x) => s + x.valor, 0), qtd: resto.reduce((s, x) => s + x.qtd, 0) }];
        }

        const porMilitar = agruparPor(notasPeriodo, (n) => `${n.militarNome || NAO_INFORMADO}|${n.militarRg || ''}`, (n) => (n.militarNome ? `${n.militarNome}${n.militarRg ? ` · RG ${n.militarRg}` : ''}` : NAO_INFORMADO));
        const porFornecedor = agruparPor(notasPeriodo, (n) => n.cnpj || '—', (n) => n.empresa || n.cnpjFormatado || formatarCnpj(n.cnpj));
        const porObjeto = agruparPor(notasPeriodo.filter((n) => n.objeto), (n) => n.objeto);

        const entradasCaixa = movsAno.reduce((s, m) => s + efeitoNoCaixa(m), 0);
        const ultimas = notasPeriodo.slice(0, 8);

        return { gasto, sacado, entradasCaixa, qtd: notasPeriodo.length, porMes, porSetor, porMilitar, porFornecedor, porObjeto, ultimas, setorAtivo: setor };
    }, [notas, movimentos, ano, setor]);

    const nomesSetorFiltro = useMemo(() => {
        const nomes = new Set(setores.map((s) => s.nome));
        notas.forEach((n) => nomes.add(n.setor || NAO_INFORMADO));
        return [...nomes];
    }, [setores, notas]);

    const tituloPeriodo = ano === 'todos' ? 'todo o período' : ano;
    const corGasto = paleta[0];
    const corSaque = paleta[2];
    const semNotas = !loading && notas.length === 0;

    return (
        <Box>
            {/* Filtros */}
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel id="painel-ano">Ano</InputLabel>
                    <Select labelId="painel-ano" label="Ano" value={ano} onChange={(e) => setAno(e.target.value)} sx={{ borderRadius: 2 }}>
                        <MenuItem value="todos">Todos</MenuItem>
                        {anos.map((a) => <MenuItem key={a} value={String(a)}>{a}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="painel-setor">Setor</InputLabel>
                    <Select labelId="painel-setor" label="Setor" value={setor} onChange={(e) => setSetor(e.target.value)} sx={{ borderRadius: 2 }}>
                        <MenuItem value="todos">Todos os setores</MenuItem>
                        {nomesSetorFiltro.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                {setor !== 'todos' && (
                    <Typography variant="caption" color="text.secondary">Gráficos de setor mostram sempre todos os setores do ano; os demais seguem o filtro.</Typography>
                )}
            </Box>

            {semNotas && (
                <Box sx={{ p: 4, mb: 2, borderRadius: 3, border: `1px dashed ${theme.palette.divider}`, textAlign: 'center' }}>
                    <ReceiptLong sx={{ fontSize: 40, color: 'text.disabled' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>Nenhuma nota fiscal lançada ainda</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Lance a primeira nota e os gráficos passam a ser montados automaticamente.</Typography>
                    <Button variant="contained" startIcon={<Add />} onClick={onNovaNota} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>Lançar nota</Button>
                </Box>
            )}

            {/* KPIs */}
            <Grade colunas={{ xs: 2, md: 4 }}>
                <KpiTile titulo={`Gasto em ${tituloPeriodo}`} valor={dados.gasto} formato={fmtMoeda} icon={Paid} cor={corGasto} ajuda={`${dados.qtd} nota(s)`} loading={loading} />
                <KpiTile titulo={`Sacado em ${tituloPeriodo}`} valor={dados.sacado} formato={fmtMoeda} icon={Savings} cor={corSaque} ajuda="Saques no banco" loading={loading} />
                <KpiTile titulo="Ticket médio" valor={dados.qtd ? dados.gasto / dados.qtd : 0} formato={fmtMoeda} icon={ReceiptLong} cor={paleta[3]} ajuda="Valor médio por nota" loading={loading} />
                <KpiTile titulo="Saldo em caixa" valor={saldoCaixa} formato={fmtMoeda} icon={AccountBalanceWallet} cor={saldoCaixa < 0 ? theme.palette.error.main : theme.palette.success.main} ajuda="Saques − devoluções ± ajustes − notas" loading={loading} />
            </Grade>

            {/* Mês a mês */}
            <Grade colunas={{ xs: 1, md: 1 }}>
                <ChartCard titulo="Gasto × sacado por mês" subtitulo={ano === 'todos' ? 'Todos os meses com lançamentos' : `Ano de ${ano}`} altura={260} expandivel>
                    {dados.porMes.length === 0 ? <Vazio /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dados.porMes} margin={{ left: 8, right: 8, top: 8, bottom: 0 }} barGap={2}>
                                <CartesianGrid vertical={false} stroke={grade(theme)} />
                                <XAxis dataKey="rotulo" tick={eixoTick(theme)} axisLine={false} tickLine={false} interval={estreito ? 1 : 0} />
                                <YAxis tick={eixoTick(theme)} axisLine={false} tickLine={false} tickFormatter={fmtMoedaCurta} width={estreito ? 60 : 72} />
                                <RTooltip content={<TooltipGrafico formatador={fmtMoeda} />} cursor={{ fill: alpha(theme.palette.text.primary, 0.04) }} />
                                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="gasto" name="Gasto (notas)" fill={corGasto} radius={[4, 4, 0, 0]} maxBarSize={36} />
                                <Bar dataKey="sacado" name="Sacado no banco" fill={corSaque} radius={[4, 4, 0, 0]} maxBarSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </Grade>

            {/* Onde e quem */}
            <Grade colunas={{ xs: 1, md: 2 }}>
                <ChartCard titulo="Gasto por setor" subtitulo={`Para onde foi o dinheiro em ${tituloPeriodo}`} altura={250} expandivel>
                    {dados.porSetor.length === 0 ? <Vazio /> : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexDirection: { xs: 'column', sm: 'row' }, height: '100%' }}>
                            <Box sx={{ width: { xs: '100%', sm: '46%' }, height: 230, position: 'relative', minWidth: 0, flexShrink: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={dados.porSetor} dataKey="valor" nameKey="nome" innerRadius="62%" outerRadius="88%" paddingAngle={2} stroke={theme.palette.background.paper} strokeWidth={2} onClick={(d) => setSetor((s) => (s === d.nome || d.nome === OUTROS ? 'todos' : d.nome))} cursor="pointer">
                                            {dados.porSetor.map((d) => <Cell key={d.chave} fill={corDoSetor(d.nome)} opacity={setor !== 'todos' && d.nome !== setor ? 0.35 : 1} />)}
                                        </Pie>
                                        <RTooltip content={<TooltipGrafico formatador={fmtMoeda} />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                    <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', lineHeight: 1 }}>{fmtMoedaCurta(dados.porSetor.reduce((s, d) => s + d.valor, 0))}</Typography>
                                    <Typography variant="caption" color="text.secondary">total</Typography>
                                </Box>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {(() => { const soma = dados.porSetor.reduce((s, d) => s + d.valor, 0); return dados.porSetor.map((d) => (
                                    <Box key={d.chave} onClick={() => setSetor((s) => (s === d.nome || d.nome === OUTROS ? 'todos' : d.nome))} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', opacity: setor !== 'todos' && d.nome !== setor ? 0.5 : 1, p: 0.25, borderRadius: 1, '&:hover': { bgcolor: alpha(theme.palette.text.primary, 0.05) } }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: corDoSetor(d.nome), flexShrink: 0 }} />
                                        <Typography variant="caption" sx={{ flex: 1, minWidth: 0, fontWeight: 600, lineHeight: 1.2 }} noWrap title={d.nome}>{d.nome}</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 800 }}>{fmtMoeda(d.valor)}</Typography>
                                        <Typography variant="caption" color="text.disabled" sx={{ width: 36, textAlign: 'right' }}>{soma ? Math.round((d.valor / soma) * 100) : 0}%</Typography>
                                    </Box>
                                )); })()}
                            </Box>
                        </Box>
                    )}
                </ChartCard>

                <ChartCard titulo="Quem mais comprou" subtitulo="Por militar (nome de guerra e RG)" altura={250} expandivel>
                    <ListaRanking itens={dados.porMilitar} cor={paleta[1]} formato={fmtMoeda} vazio="Nenhuma nota no período" />
                </ChartCard>
            </Grade>

            <Grade colunas={{ xs: 1, md: 2 }}>
                <ChartCard titulo="Fornecedores" subtitulo="Empresas (CNPJ) que mais receberam" altura={250} expandivel>
                    <ListaRanking itens={dados.porFornecedor} cor={paleta[4]} formato={fmtMoeda} vazio="Nenhuma nota no período" />
                </ChartCard>
                <ChartCard titulo="O que foi comprado" subtitulo="Por objeto da nota" altura={250} expandivel>
                    <ListaRanking itens={dados.porObjeto} cor={paleta[6]} formato={fmtMoeda} vazio="Nenhuma nota com objeto informado" />
                </ChartCard>
            </Grade>

            <Grade colunas={{ xs: 1, md: 1 }} sx={{ mb: 0 }}>
                <ChartCard titulo="Últimas notas lançadas" subtitulo={setor !== 'todos' ? `Setor ${setor}` : 'Mais recentes primeiro'} altura={0} expandivel>
                    <TabelaCompacta
                        colunas={[
                            { chave: 'data', titulo: 'Data', render: (l) => fmtData(l.data) },
                            { chave: 'fornecedor', titulo: 'Fornecedor', render: (l) => l.empresa || l.cnpjFormatado, largura: 220 },
                            { chave: 'objeto', titulo: 'Objeto', largura: 240 },
                            { chave: 'setor', titulo: 'Setor', render: (l) => l.setor || '—' },
                            { chave: 'militar', titulo: 'Militar', render: (l) => (l.militarNome ? `${l.militarNome}${l.militarRg ? ` (${l.militarRg})` : ''}` : '—') },
                            { chave: 'valor', titulo: 'Valor', alinhar: 'right', render: (l) => <b>{fmtMoeda(l.valor)}</b> },
                        ]}
                        linhas={dados.ultimas}
                        vazio="Nenhuma nota no período"
                    />
                </ChartCard>
            </Grade>
        </Box>
    );
}
