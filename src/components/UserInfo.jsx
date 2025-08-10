import { Box, Fab, Paper, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { decodeJWT } from '../firebase/token';

const UserInfo = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [userInfo, setUserInfo] = useState({
        name: '',
        role: '',
        token: '',
        expiration: null
    });
    const [showPaper, setShowPaper] = useState(localStorage.getItem('showPaper') === 'true'
        || localStorage.getItem('showPaper') === null);



    useEffect(() => {
        localStorage.setItem('showPaper', showPaper);
    }, [showPaper]);





    useEffect(() => {
        const token = localStorage.getItem('token');

        if (token) {
            const payload = decodeJWT(token);
            if (payload) {
                // exp vem em segundos, multiplicamos por 1000 para converter para milissegundos
                const expirationDate = new Date(payload.exp * 1000);

                setUserInfo({
                    name: payload.username || 'N/A',
                    role: payload.role || 'N/A',
                    token: token.substring(0, 15) + '...',
                    expiration: expirationDate.toLocaleString()
                });
            }
        }
    }, []);

    if (isMobile) return null;

    return (
        <div>




            {!showPaper &&
                <Tooltip title="Mostrar informações do usuário" arrow>
                    <Fab
                        size='small'
                        onClick={() => setShowPaper(!showPaper)}
                        sx={{
                            position: 'fixed',
                            bottom: 50,
                            right: 10,
                            zIndex: 1000,
                            backgroundColor: '#90caf9',
                            color: 'white',
                            '&:hover': {
                                backgroundColor: '#90caf9'
                            }
                        }}>
                        <AccountCircle />
                    </Fab>
                </Tooltip>}
            {
                showPaper &&
                <Paper
                    onClick={() => setShowPaper(!showPaper)}
                    sx={{
                        position: 'fixed',
                        bottom: 50,
                        right: 10,
                        zIndex: 1000,
                        p: 1.5,
                        width: 250,
                        backgroundColor: 'rgba(33, 33, 33, 0.5)', // Tema escuro com opacidade
                        color: 'white',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        borderRadius: 1,
                        //impedir seleção
                        userSelect: 'none',
                        display: { xs: 'none', sm: 'block' } // Alternativa usando o sistema de breakpoints no sx
                    }}
                >
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mb: 1,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        pb: 1
                    }}>
                        <AccountCircle sx={{ fontSize: '1.2rem', mr: 1, color: '#90caf9' }} />
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#90caf9' }}>
                            {userInfo.name || 'Usuário'}
                        </Typography>
                    </Box>
                    <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'rgba(255, 255, 255, 0.7)' }}>
                        <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Perfil:</strong> {userInfo.role}
                    </Typography>

                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Expira em:</strong> {userInfo.expiration}
                    </Typography>
                </Paper>
            }
        </div>
    );
};

export default UserInfo;