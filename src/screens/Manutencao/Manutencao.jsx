import { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Paper, alpha, useMediaQuery, useTheme } from '@mui/material';
import { BarChartOutlined, CalendarMonthOutlined, EventNoteOutlined, HistoryOutlined, BuildCircleOutlined } from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import MenuContext from '../../contexts/MenuContext';
import PrivateRoute from '../../contexts/PrivateRoute';
import MaintenanceDashboard from '../../components/maintenance/MaintenanceDashboard';
import MaintenanceCalendar from '../../components/maintenance/MaintenanceCalendar';
import MaintenanceHistory from '../../components/maintenance/MaintenanceHistory';
import MaintenanceCalendarView from '../../components/maintenance/MaintenanceCalendarView';
import TabPanel from '../../components/TabPanel';

const ABAS = [
    { label: 'Dashboard', icon: BarChartOutlined, descricao: 'Visão geral, atrasadas e próximas' },
    { label: 'Cronograma', icon: EventNoteOutlined, descricao: 'Tabela completa com filtros e ações' },
    { label: 'Histórico', icon: HistoryOutlined, descricao: 'O que foi feito em cada conclusão' },
    { label: 'Calendário', icon: CalendarMonthOutlined, descricao: 'Distribuição por dia' },
];

const Manutencao = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [searchParams] = useSearchParams();
    const initialTab = parseInt(searchParams.get('tab')) || 0;
    const materialId = searchParams.get('materialId') || '';

    const [tabValue, setTabValue] = useState(initialTab);

    useEffect(() => {
        const tab = parseInt(searchParams.get('tab'));
        if (!isNaN(tab) && tab >= 0 && tab <= 3) {
            setTabValue(tab);
        }
    }, [searchParams]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    return (
        <PrivateRoute>
        <MenuContext>
            <Box className="root-protected" sx={{ p: { xs: 1.5, sm: 3 } }}>
                {/* Cabeçalho */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, mb: 2.5, py: { xs: 0.5, sm: 1 } }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.3)}`, flexShrink: 0 }}>
                        <BuildCircleOutlined />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h4" sx={{ fontSize: { xs: '1.15rem', sm: '1.5rem' }, fontWeight: 800, color: 'primary.main', lineHeight: 1.2 }}>
                            Cronograma de Manutenção
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {ABAS[tabValue]?.descricao}
                        </Typography>
                    </Box>
                </Box>

                <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 1)}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.12 : 0.04), px: { xs: 0.5, sm: 1.5 } }}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            aria-label="abas de manutenção"
                            variant={isMobile ? 'fullWidth' : 'standard'}
                            sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 54, fontSize: '0.9rem' }, '& .MuiTabs-indicator': { height: 3, borderRadius: 3 } }}
                        >
                            {ABAS.map((a) => {
                                const Icon = a.icon;
                                return <Tab key={a.label} label={isMobile ? undefined : a.label} icon={<Icon sx={{ fontSize: 20 }} />} iconPosition="start" aria-label={a.label} />;
                            })}
                        </Tabs>
                    </Box>
                    <TabPanel value={tabValue} index={0}>
                        <MaintenanceDashboard />
                    </TabPanel>
                    <TabPanel value={tabValue} index={1}>
                        <MaintenanceCalendar />
                    </TabPanel>
                    <TabPanel value={tabValue} index={2}>
                        <MaintenanceHistory materialIdFilter={materialId} />
                    </TabPanel>
                    <TabPanel value={tabValue} index={3}>
                        <MaintenanceCalendarView />
                    </TabPanel>
                </Paper>
            </Box>
        </MenuContext>
        </PrivateRoute>
    );
};

export default Manutencao;
