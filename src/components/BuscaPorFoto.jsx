import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    IconButton,
    LinearProgress,
    Tooltip,
    Typography,
    alpha,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import {
    CameraAltOutlined,
    Close,
    Inventory2Outlined,
    LocalShippingOutlined,
    PhotoCameraOutlined,
    Replay,
    Search,
    AutoAwesome,
} from '@mui/icons-material';
import { useMaterials } from '../contexts/MaterialContext';
import useCurrentUser from '../hooks/useCurrentUser';
import { logAudit } from '../firebase/auditLog';
import { buscarMateriaisPorTermos, identificarMaterialPorFoto, mensagemErroVisao } from '../services/visaoService';
import MaterialLocalHint from './locais/MaterialLocalHint';

const CONFIANCA = {
    alta: { label: 'Confiança alta', cor: '#16a34a' },
    media: { label: 'Confiança média', cor: '#d97706' },
    baixa: { label: 'Confiança baixa', cor: '#dc2626' },
};

/**
 * Botão de câmera para "buscar por foto": tira a foto do material, o servidor
 * reconhece o objeto (Claude) e o app procura os materiais parecidos no estoque.
 *
 * @param {(termo: string) => void} onTermo         preenche a busca da tela com o termo escolhido
 * @param {(material) => void} [onSelecionarMaterial] ação ao tocar num material encontrado (padrão: onTermo(descrição))
 * @param {'icon'|'button'} [variant]
 */
export default function BuscaPorFoto({ onTermo, onSelecionarMaterial, variant = 'icon', size = 'small', sx, corIcone }) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const { materials } = useMaterials();
    const currentUser = useCurrentUser();
    const inputRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [preview, setPreview] = useState(null);
    const [fase, setFase] = useState('idle'); // idle | enviando | resultado | erro
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState(null);

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const encontrados = useMemo(
        () => (resultado ? buscarMateriaisPorTermos([resultado.objeto, ...resultado.termos], materials) : []),
        [resultado, materials],
    );

    const abrirCamera = () => {
        if (inputRef.current) { inputRef.current.value = ''; inputRef.current.click(); }
    };

    const processar = async (file) => {
        if (!file) return;
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(file));
        setResultado(null);
        setErro(null);
        setFase('enviando');
        setOpen(true);
        try {
            const r = await identificarMaterialPorFoto(file);
            setResultado(r);
            setFase('resultado');
            const achados = buscarMateriaisPorTermos([r.objeto, ...r.termos], materials);
            logAudit({
                action: 'busca_por_foto',
                userId: currentUser.userId,
                userName: currentUser.fullName || currentUser.username || '',
                targetCollection: 'materials',
                targetName: r.objeto,
                details: { termos: r.termos, confianca: r.confianca, modelo: r.modelo, tokens: r.tokens, encontrados: achados.slice(0, 5).map((a) => a.material.description) },
            });
        } catch (e) {
            console.error('Busca por foto:', e);
            setErro(mensagemErroVisao(e));
            setFase('erro');
        }
    };

    const fechar = () => { if (fase !== 'enviando') setOpen(false); };
    const escolherTermo = (termo) => { onTermo?.(termo); setOpen(false); };
    const escolherMaterial = (m) => {
        if (onSelecionarMaterial) onSelecionarMaterial(m); else onTermo?.(m.description || '');
        setOpen(false);
    };

    const conf = CONFIANCA[resultado?.confianca] || CONFIANCA.media;
    const cor = corIcone || theme.palette.primary.main;

    return (
        <>
            <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => processar(e.target.files?.[0])} />

            {variant === 'button' ? (
                <Tooltip title="Fotografe o material e o app encontra no estoque, como uma busca digitada" arrow>
                    <Button
                        onClick={abrirCamera}
                        variant="outlined"
                        size="small"
                        startIcon={<PhotoCameraOutlined sx={{ fontSize: '18px !important' }} />}
                        sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            px: 1.5,
                            alignSelf: 'center',
                            color: 'text.secondary',
                            borderColor: alpha(theme.palette.divider, 0.8),
                            bgcolor: 'background.paper',
                            '&:hover': { color: cor, borderColor: cor, bgcolor: alpha(cor, 0.06) },
                            ...sx,
                        }}
                    >
                        Buscar por foto
                    </Button>
                </Tooltip>
            ) : (
                <Tooltip title="Buscar por foto: fotografe o material e o app encontra no estoque" arrow>
                    <IconButton size={size} onClick={abrirCamera} aria-label="Buscar por foto" sx={{ color: cor, '&:hover': { bgcolor: alpha(cor, 0.1) }, ...sx }}>
                        <CameraAltOutlined fontSize={size === 'small' ? 'small' : 'medium'} />
                    </IconButton>
                </Tooltip>
            )}

            <Dialog open={open} onClose={fechar} maxWidth="sm" fullWidth fullScreen={fullScreen} PaperProps={{ sx: { borderRadius: fullScreen ? 0 : 3, overflow: 'hidden' } }}>
                {/* Cabeçalho com a foto */}
                <Box sx={{ position: 'relative', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${alpha(theme.palette.primary.main, 0.75)} 100%)`, color: '#fff', p: { xs: 2, sm: 2.5 }, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ width: { xs: 84, sm: 110 }, height: { xs: 84, sm: 110 }, borderRadius: 2.5, overflow: 'hidden', flexShrink: 0, bgcolor: alpha('#000', 0.25), border: `2px solid ${alpha('#fff', 0.5)}`, boxShadow: `0 8px 24px ${alpha('#000', 0.3)}` }}>
                        {preview ? <Box component="img" src={preview} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <PhotoCameraOutlined sx={{ m: 'auto' }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1.2, lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AutoAwesome sx={{ fontSize: 14 }} /> Busca por foto
                        </Typography>
                        {fase === 'enviando' && (
                            <>
                                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Reconhecendo o material…</Typography>
                                <Typography variant="body2" sx={{ opacity: 0.85 }}>Leva de 2 a 6 segundos.</Typography>
                            </>
                        )}
                        {fase === 'resultado' && resultado && (
                            <>
                                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, textTransform: 'capitalize' }}>{resultado.objeto}</Typography>
                                {resultado.descricao && <Typography variant="body2" sx={{ opacity: 0.85 }} noWrap>{resultado.descricao}</Typography>}
                                <Chip size="small" label={conf.label} sx={{ mt: 0.75, height: 22, fontWeight: 700, bgcolor: alpha('#fff', 0.18), color: '#fff' }} />
                            </>
                        )}
                        {fase === 'erro' && <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>Não deu para reconhecer</Typography>}
                    </Box>
                    <IconButton onClick={fechar} disabled={fase === 'enviando'} size="small" sx={{ color: '#fff', position: 'absolute', top: 8, right: 8 }} aria-label="Fechar"><Close /></IconButton>
                </Box>
                {fase === 'enviando' && <LinearProgress />}

                <DialogContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    {fase === 'enviando' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2, color: 'text.secondary' }}>
                            <CircularProgress size={22} />
                            <Typography variant="body2">Enviando a foto comprimida e comparando com os {materials.length} materiais do DEMOP…</Typography>
                        </Box>
                    )}

                    {fase === 'erro' && (
                        <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>{erro}</Alert>
                    )}

                    {fase === 'resultado' && resultado && (
                        <>
                            {/* Termos de busca */}
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>Buscar por</Typography>
                            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
                                {[resultado.objeto, ...resultado.termos.filter((t) => t.toLowerCase() !== resultado.objeto.toLowerCase())].map((t, i) => (
                                    <Chip
                                        key={`${t}-${i}`}
                                        icon={<Search sx={{ fontSize: '15px !important' }} />}
                                        label={t}
                                        onClick={() => escolherTermo(t)}
                                        color={i === 0 ? 'primary' : 'default'}
                                        variant={i === 0 ? 'filled' : 'outlined'}
                                        sx={{ fontWeight: 700 }}
                                    />
                                ))}
                            </Box>

                            {/* Materiais encontrados */}
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                                {encontrados.length ? `${encontrados.length} material(is) parecido(s) no estoque` : 'Nenhum material parecido no estoque'}
                            </Typography>
                            {encontrados.length === 0 && (
                                <Alert severity="info" sx={{ borderRadius: 2 }}>
                                    O DEMOP não tem nada cadastrado com esse nome. Toque num termo acima para pesquisar mesmo assim ou tire outra foto.
                                </Alert>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {encontrados.map(({ material: m, pontuacao }, idx) => (
                                    <Box
                                        key={m.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => escolherMaterial(m)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolherMaterial(m); } }}
                                        sx={{
                                            display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1.25, borderRadius: 2.5, cursor: 'pointer',
                                            border: '1px solid', borderColor: idx === 0 ? alpha(theme.palette.primary.main, 0.5) : 'divider',
                                            bgcolor: idx === 0 ? alpha(theme.palette.primary.main, 0.05) : 'background.paper',
                                            transition: 'all .15s', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-1px)' },
                                        }}
                                    >
                                        <Avatar variant="rounded" src={m.image_url || undefined} sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                                            <Inventory2Outlined />
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.25, flex: 1 }}>{m.description}</Typography>
                                                <Chip size="small" label={`${Math.round(pontuacao * 100)}%`} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.12), color: 'success.main' }} />
                                            </Box>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {m.categoria || 'Sem categoria'} · {Number(m.estoque_atual) || 0} disponível(is)
                                                {Number(m.estoque_viatura) > 0 && (
                                                    <> · <LocalShippingOutlined sx={{ fontSize: 12, verticalAlign: 'middle' }} /> {m.estoque_viatura} em viatura</>
                                                )}
                                            </Typography>
                                            <MaterialLocalHint materialId={m.id} titulo="Onde está" compact />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, mt: 2.5, alignItems: 'center' }}>
                        <Button size="small" startIcon={<Replay />} onClick={abrirCamera} disabled={fase === 'enviando'} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                            Outra foto
                        </Button>
                        <Box sx={{ flex: 1 }} />
                        {resultado?.tokens && (
                            <Typography variant="caption" color="text.disabled">{resultado.modelo}</Typography>
                        )}
                        <Button size="small" onClick={fechar} disabled={fase === 'enviando'} sx={{ textTransform: 'none', borderRadius: 2 }}>Fechar</Button>
                    </Box>
                </DialogContent>
            </Dialog>
        </>
    );
}
