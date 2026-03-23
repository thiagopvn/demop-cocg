import { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import MenuContext from '../../contexts/MenuContext';
import PrivateRoute from '../../contexts/PrivateRoute';
import MaintenanceDashboard from '../../components/maintenance/MaintenanceDashboard';
import MaintenanceCalendar from '../../components/maintenance/MaintenanceCalendar';
import MaintenanceHistory from '../../components/maintenance/MaintenanceHistory';
import MaintenanceCalendarView from '../../components/maintenance/MaintenanceCalendarView';
import TabPanel from '../../components/TabPanel';

const Manutencao = () => {
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
                <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.15rem', sm: '1.5rem' }, fontWeight: 700 }}>
                    Cronograma de Manutenção
                </Typography>
                <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tabValue} onChange={handleTabChange} aria-label="abas de manutenção" variant="scrollable" scrollButtons="auto">
                            <Tab label="Dashboard" />
                            <Tab label="Cronograma" />
                            <Tab label="Histórico" />
                            <Tab label="Calendário" />
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
