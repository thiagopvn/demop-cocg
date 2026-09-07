import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, CircularProgress, Typography, Menu, MenuItem, ListItemIcon, ListItemText, alpha, useMediaQuery } from '@mui/material';
import { PhotoCamera, Collections, Delete, Edit, ContentPaste } from '@mui/icons-material';
import UserAvatar from './UserAvatar';
import { validarImagem } from '../utils/imageUpload';

/**
 * Avatar com botao para trocar a foto. Nao faz upload: devolve o File escolhido
 * via `onChange(file | null)` (null = remover foto). Quem salva decide quando enviar.
 *
 * @param {string} src URL atual da foto
 * @param {string} name usado nas iniciais
 * @param {string} role cor do avatar sem foto
 * @param {number} size px
 * @param {boolean} uploading mostra progresso
 * @param {number} progress 0-100
 */
export default function AvatarUpload({ src, name, role, size = 112, onChange, uploading = false, progress = 0, disabled = false, permitirColar = false, sx }) {
    const [preview, setPreview] = useState(null);
    const [erro, setErro] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const fileRef = useRef(null);
    const cameraRef = useRef(null);
    const temMouse = useMediaQuery('(hover: hover) and (pointer: fine)');

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const aplicarArquivo = (file) => {
        if (!file) return;
        const msg = validarImagem(file);
        if (msg) { setErro(msg); return; }
        setErro(null);
        setPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
        onChange?.(file);
    };

    // Ctrl+V com uma captura de tela (Win+Shift+S) enquanto o componente esta na tela
    useEffect(() => {
        if (!permitirColar || disabled) return undefined;
        const onPaste = (e) => {
            const itens = Array.from(e.clipboardData?.items || []);
            const item = itens.find(i => i.kind === 'file' && i.type.startsWith('image/'));
            if (!item) return;
            const file = item.getAsFile();
            if (!file) return;
            e.preventDefault();
            aplicarArquivo(new File([file], `colada_${Date.now()}.png`, { type: file.type || 'image/png' }));
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permitirColar, disabled]);

    const colarDaAreaDeTransferencia = async () => {
        setMenuAnchor(null);
        try {
            if (!navigator.clipboard?.read) throw new Error('unsupported');
            const itens = await navigator.clipboard.read();
            for (const item of itens) {
                const tipo = item.types.find(t => t.startsWith('image/'));
                if (tipo) {
                    const blob = await item.getType(tipo);
                    aplicarArquivo(new File([blob], `colada_${Date.now()}.png`, { type: tipo }));
                    return;
                }
            }
            setErro('Não há imagem na área de transferência. Capture com Win+Shift+S e tente de novo.');
        } catch {
            setErro('Não foi possível ler a área de transferência. Com a foto copiada, pressione Ctrl+V aqui na tela.');
        }
    };

    const escolher = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        aplicarArquivo(file);
    };

    const remover = () => {
        setMenuAnchor(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setErro(null);
        onChange?.(null);
    };

    const mostrando = preview || src;
    const anelCor = alpha('#ff6b35', 0.9);

    return (
        <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', ...sx }}>
            <Box sx={{ position: 'relative', width: size, height: size }}>
                <Box
                    sx={{
                        width: size,
                        height: size,
                        borderRadius: '50%',
                        p: '3px',
                        background: `linear-gradient(135deg, ${anelCor} 0%, #1e3a5f 100%)`,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    }}
                >
                    <UserAvatar
                        src={preview || (src || undefined)}
                        name={name}
                        role={role}
                        size={size - 6}
                        sx={{ border: '3px solid #fff', opacity: uploading ? 0.6 : 1, transition: 'opacity 0.2s' }}
                    />
                </Box>
                {uploading && (
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircularProgress variant={progress > 0 ? 'determinate' : 'indeterminate'} value={progress} size={size * 0.5} thickness={3} sx={{ color: '#fff', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} />
                    </Box>
                )}
                <Tooltip title={mostrando ? 'Trocar foto' : 'Adicionar foto'}>
                    <span>
                        <IconButton
                            size="small"
                            disabled={disabled || uploading}
                            aria-label={mostrando ? 'Trocar foto' : 'Adicionar foto'}
                            onClick={(e) => setMenuAnchor(e.currentTarget)}
                            sx={{
                                position: 'absolute',
                                right: -2,
                                bottom: -2,
                                width: Math.max(32, size * 0.32),
                                height: Math.max(32, size * 0.32),
                                bgcolor: '#ff6b35',
                                color: '#fff',
                                border: '3px solid #fff',
                                boxShadow: '0 4px 12px rgba(255,107,53,0.4)',
                                transition: 'transform 0.2s ease, background-color 0.2s',
                                '&:hover': { bgcolor: '#e85a24', transform: 'scale(1.08)' },
                            }}
                        >
                            {mostrando ? <Edit sx={{ fontSize: size * 0.16 }} /> : <PhotoCamera sx={{ fontSize: size * 0.17 }} />}
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} PaperProps={{ sx: { borderRadius: 2.5, minWidth: 210, mt: 1 } }}>
                <MenuItem onClick={() => { setMenuAnchor(null); cameraRef.current?.click(); }}>
                    <ListItemIcon><PhotoCamera fontSize="small" /></ListItemIcon>
                    <ListItemText>Tirar foto</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { setMenuAnchor(null); fileRef.current?.click(); }}>
                    <ListItemIcon><Collections fontSize="small" /></ListItemIcon>
                    <ListItemText>Escolher da galeria</ListItemText>
                </MenuItem>
                {permitirColar && temMouse && (
                    <MenuItem onClick={colarDaAreaDeTransferencia}>
                        <ListItemIcon><ContentPaste fontSize="small" /></ListItemIcon>
                        <ListItemText primary="Colar da área de transferência" secondary="Win+Shift+S e depois Ctrl+V" />
                    </MenuItem>
                )}
                {mostrando && (
                    <MenuItem onClick={remover} sx={{ color: 'error.main' }}>
                        <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText>Remover foto</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            <input ref={fileRef} type="file" accept="image/*" hidden onChange={escolher} />
            <input ref={cameraRef} type="file" accept="image/*" capture="user" hidden onChange={escolher} />

            {erro && (
                <Typography variant="caption" sx={{ color: 'error.main', mt: 1, fontWeight: 600, textAlign: 'center' }}>{erro}</Typography>
            )}
            {permitirColar && temMouse && !erro && (
                <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, textAlign: 'center' }}>Dica: capture com Win+Shift+S e pressione Ctrl+V</Typography>
            )}
        </Box>
    );
}
