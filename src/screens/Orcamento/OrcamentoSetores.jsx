import { useMemo, useState } from 'react';
import { Box, Button, Chip, CircularProgress, IconButton, List, ListItem, ListItemText, Paper, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import { Add, Check, Close, Delete, Edit } from '@mui/icons-material';
import { CampoCaixaAlta } from '../../components/orcamento/CamposOrcamento';
import { adicionarSetor, excluirSetor, fmtMoeda, renomearSetor } from '../../services/orcamentoService';

/**
 * Lista editável dos setores de destino (DEMOP, SST, SSCO, SSMT, ...).
 * Renomear atualiza as notas já lançadas; excluir só é permitido quando nenhuma nota usa o setor.
 */
export default function OrcamentoSetores({ setores, notas, user, onAviso }) {
    const theme = useTheme();
    const [novo, setNovo] = useState('');
    const [editando, setEditando] = useState(null); // { id, nome }
    const [busy, setBusy] = useState(null); // id em operação ou 'novo'

    const usoPorSetor = useMemo(() => {
        const mapa = new Map();
        notas.forEach((n) => {
            if (!n.setor) return;
            const a = mapa.get(n.setor) || { qtd: 0, valor: 0 };
            a.qtd += 1;
            a.valor += Number(n.valor) || 0;
            mapa.set(n.setor, a);
        });
        return mapa;
    }, [notas]);

    const executar = async (chave, fn, ok) => {
        setBusy(chave);
        try {
            await fn();
            if (ok) onAviso?.(ok);
        } catch (e) {
            console.error(e);
            onAviso?.(e?.message || 'Não foi possível salvar.', 'error');
        } finally {
            setBusy(null);
        }
    };

    const adicionar = () => executar('novo', async () => {
        const nome = await adicionarSetor(novo, setores, user);
        setNovo('');
        onAviso?.(`Setor ${nome} adicionado.`);
    });

    const salvarRenomeacao = () => {
        const alvo = setores.find((s) => s.id === editando.id);
        if (!alvo) return setEditando(null);
        executar(alvo.id, async () => {
            await renomearSetor(alvo, editando.nome, setores, user);
            setEditando(null);
        }, 'Setor renomeado (notas atualizadas).');
    };

    return (
        <Box sx={{ maxWidth: 720 }}>
            <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Novo setor de destino</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                    Aparece na lista "Destino da compra" do lançamento de notas. Também dá para criar direto no modal ("Outro setor…").
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <CampoCaixaAlta label="Nome do setor" placeholder="Ex.: SUBCOMANDO, ALMOXARIFADO" value={novo} onChange={setNovo} onKeyDown={(e) => { if (e.key === 'Enter' && novo.trim()) adicionar(); }} sx={{ flex: 1, minWidth: 200 }} />
                    <Button variant="contained" startIcon={busy === 'novo' ? <CircularProgress size={16} color="inherit" /> : <Add />} onClick={adicionar} disabled={!novo.trim() || busy === 'novo'} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}>
                        Adicionar
                    </Button>
                </Box>
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
                <List disablePadding>
                    {setores.length === 0 && (
                        <ListItem><ListItemText primary="Nenhum setor cadastrado." secondary="Os setores padrão são criados automaticamente na primeira abertura." /></ListItem>
                    )}
                    {setores.map((s, i) => {
                        const uso = usoPorSetor.get(s.nome);
                        const emEdicao = editando?.id === s.id;
                        const ocupado = busy === s.id;
                        return (
                            <ListItem
                                key={s.id}
                                divider={i < setores.length - 1}
                                sx={{ gap: 1, flexWrap: 'wrap', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) } }}
                                secondaryAction={emEdicao ? (
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Tooltip title="Salvar"><span><IconButton size="small" color="success" onClick={salvarRenomeacao} disabled={ocupado || !editando.nome.trim()} aria-label="Salvar nome">{ocupado ? <CircularProgress size={16} /> : <Check fontSize="small" />}</IconButton></span></Tooltip>
                                        <Tooltip title="Cancelar"><IconButton size="small" onClick={() => setEditando(null)} disabled={ocupado} aria-label="Cancelar"><Close fontSize="small" /></IconButton></Tooltip>
                                    </Box>
                                ) : (
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Tooltip title="Renomear"><IconButton size="small" onClick={() => setEditando({ id: s.id, nome: s.nome })} disabled={Boolean(busy)} aria-label={`Renomear ${s.nome}`}><Edit fontSize="small" /></IconButton></Tooltip>
                                        <Tooltip title={uso ? `Em uso por ${uso.qtd} nota(s) — renomeie em vez de excluir` : 'Excluir'}>
                                            <span>
                                                <IconButton size="small" color="error" disabled={Boolean(uso) || Boolean(busy)} onClick={() => executar(s.id, () => excluirSetor(s, user), `Setor ${s.nome} excluído.`)} aria-label={`Excluir ${s.nome}`}>
                                                    {ocupado ? <CircularProgress size={16} /> : <Delete fontSize="small" />}
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                )}
                            >
                                {emEdicao ? (
                                    <CampoCaixaAlta
                                        value={editando.nome}
                                        onChange={(v) => setEditando((e) => ({ ...e, nome: v }))}
                                        onKeyDown={(e) => { if (e.key === 'Enter') salvarRenomeacao(); if (e.key === 'Escape') setEditando(null); }}
                                        autoFocus
                                        sx={{ flex: 1, minWidth: 180, mr: 10 }}
                                    />
                                ) : (
                                    <ListItemText
                                        primary={<Typography sx={{ fontWeight: 700 }}>{s.nome}</Typography>}
                                        secondary={uso ? `${uso.qtd} nota(s) · ${fmtMoeda(uso.valor)}` : 'Sem notas'}
                                        sx={{ mr: 10 }}
                                    />
                                )}
                                {!emEdicao && uso && <Chip label={fmtMoeda(uso.valor)} size="small" sx={{ fontWeight: 700, mr: 10, display: { xs: 'none', sm: 'inline-flex' } }} />}
                            </ListItem>
                        );
                    })}
                </List>
            </Paper>
        </Box>
    );
}
