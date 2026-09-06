import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, CircularProgress, Typography, Menu, MenuItem, ListItemIcon, ListItemText, alpha } from '@mui/material';
import { PhotoCamera, Collections, Delete, Edit } from '@mui/icons-material';
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
export default function AvatarUpload({ src, name, role, size = 112, onChange, uploading = false, progress = 0, disabled = false, sx }) {
    const [preview, setPreview] = useState(null);
    const [erro, setErro] = useState(null);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const fileRef = useRef(null);
    const cameraRef = useRef(null);

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const escolher = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const msg = validarImagem(file);
        if (msg) { setErro(msg); return; }
        setErro(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(file));
        onChange?.(file);
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
        </Box>
    );
}
