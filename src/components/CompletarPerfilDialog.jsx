import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, FormControl, InputLabel, Select, MenuItem, Box, CircularProgress, Alert, alpha, useTheme } from '@mui/material';
import { MilitaryTech } from '@mui/icons-material';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import db from '../firebase/db';
import AvatarUpload from './AvatarUpload';
import { usePostos } from '../hooks/useListasMilitares';
import { compressAvatar, uploadImageFile } from '../utils/imageUpload';
import { logAudit } from '../firebase/auditLog';

const CHAVE = 'demop-completar-perfil-adiado';

/**
 * Modal facultativo do primeiro acesso: pede posto e foto a quem ainda não tem posto cadastrado.
 * "Agora não" só adia para o próximo login; nunca impede o uso do sistema.
 */
export default function CompletarPerfilDialog({ user }) {
    const theme = useTheme();
    const { lista: postos } = usePostos();
    const [open, setOpen] = useState(false);
    const [posto, setPosto] = useState('');
    const [foto, setFoto] = useState(undefined);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (!user?.userId || user.loading || user.posto === undefined) return;
        let adiado = false;
        try { adiado = sessionStorage.getItem(CHAVE) === '1'; } catch { /* sem storage */ }
        setOpen(!user.posto && !adiado);
    }, [user?.userId, user?.loading, user?.posto]);

    const adiar = () => { try { sessionStorage.setItem(CHAVE, '1'); } catch { /* sem storage */ } setOpen(false); };

    const salvar = async () => {
        if (!posto) { setErro('Escolha o seu posto ou graduação.'); return; }
        setSalvando(true); setErro('');
        try {
            const dados = { posto };
            if (foto) {
                const comprimida = await compressAvatar(foto, 512);
                const storagePath = `usuarios/${user.userId}/avatar_${Date.now()}.jpg`;
                const { downloadURL } = await uploadImageFile(comprimida, storagePath);
                dados.foto_url = downloadURL; dados.foto_storagePath = storagePath; dados.foto_atualizada_em = serverTimestamp();
            }
            await updateDoc(doc(db, 'users', user.userId), dados);
            logAudit({ action: 'perfil_update', userId: user.userId, userName: user.username || '', targetCollection: 'users', targetId: user.userId, targetName: user.fullName || user.username || '', details: { alteracoes: [{ campo: 'posto', de: '', para: posto }, ...(foto ? [{ campo: 'foto', de: 'sem foto', para: 'nova foto' }] : [])] } });
            setOpen(false);
        } catch (e) {
            setErro(e?.code === 'permission-denied' ? 'Sem permissão para salvar. Saia e entre de novo.' : 'Não foi possível salvar. Tente novamente.');
        } finally { setSalvando(false); }
    };

    if (!user?.userId) return null;
    return (
        <Dialog open={open} onClose={salvando ? undefined : adiar} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, pb: 1 }}><MilitaryTech color="secondary" /> Complete seu perfil</DialogTitle>
            <DialogContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Olá, {String(user.fullName || user.username || '').split(' ')[0]}! Informe seu posto/graduação e, se quiser, uma foto. Isso ajuda o DEMOP a identificar você nas cautelas e no chat.
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, mb: 2.5 }}>
                    <AvatarUpload src={user.fotoUrl} name={user.fullName || user.username} role={user.role} size={104} onChange={(f) => setFoto(f)} />
                    <Typography variant="caption" color="text.secondary">Foto (opcional)</Typography>
                </Box>
                <FormControl fullWidth>
                    <InputLabel id="posto-primeiro-acesso">Posto / graduação</InputLabel>
                    <Select labelId="posto-primeiro-acesso" label="Posto / graduação" value={posto} onChange={(e) => { setPosto(e.target.value); setErro(''); }} sx={{ borderRadius: 2 }}>
                        {postos.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                    </Select>
                </FormControl>
                {erro && <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }}>{erro}</Alert>}
                <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.disabled' }}>Você pode pular e continuar usando o sistema normalmente. Perguntamos de novo no próximo acesso.</Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0, gap: 1 }}>
                <Button onClick={adiar} disabled={salvando} sx={{ textTransform: 'none', color: 'text.secondary' }}>Pular por agora</Button>
                <Button variant="contained" onClick={salvar} disabled={salvando} startIcon={salvando ? <CircularProgress size={14} color="inherit" /> : null} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800, bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.9) } }}>Salvar</Button>
            </DialogActions>
        </Dialog>
    );
}
