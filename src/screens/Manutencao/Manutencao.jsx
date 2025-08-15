import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Paper } from '@mui/material';
import { MenuContext } from '../../contexts/MenuContext';
import MaintenanceDashboard from '../../components/maintenance/MaintenanceDashboard';
import MaintenanceCalendar from '../../components/maintenance/MaintenanceCalendar';
import MaintenanceHistory from '../../components/maintenance/MaintenanceHistory';
import TabPanel from '../../components/TabPanel';

const Manutencao = () => {
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    return (
        <MenuContext>
            <Box className="root-protected">
                <Typography variant="h4" gutterBottom>
                    Cronograma de Manutenção
                </Typography>
                <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tabValue} onChange={handleTabChange} aria-label="abas de manutenção">
                            <Tab label="Dashboard" />
                            <Tab label="Cronograma" />
                            <Tab label="Histórico" />
                        </Tabs>
                    </Box>
                    <TabPanel value={tabValue} index={0}>
                        <MaintenanceDashboard />
                    </TabPanel>
                    <TabPanel value={tabValue} index={1}>
                        <MaintenanceCalendar />
                    </TabPanel>
                    <TabPanel value={tabValue} index={2}>
                        <MaintenanceHistory />
                    </TabPanel>
                </Paper>
            </Box>
        </MenuContext>
    );
};

export default Manutencao;