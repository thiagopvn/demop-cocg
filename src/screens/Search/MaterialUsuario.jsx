import { useEffect, useState } from "react";
import MaterialSearch from "../../components/MaterialSearch";
import {
  Paper,
  Button,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Fab,
  Tooltip,
  Popover,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Fade,
  Container,
  Alert,
  AlertTitle,
  CircularProgress
} from "@mui/material";
import {
  Clear as ClearIcon,
  FileDownload as FileDownloadIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ExitToApp as ExitIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import db from "../../firebase/db";
import { query, collection, where, getDocs, orderBy } from "firebase/firestore";
import { exportarMovimentacoes } from "../../firebase/xlsx";
import excelIcon from "../../assets/excel.svg";

export default function MaterialUsuario() {
  const [materialCritery, setMaterialCritery] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [filteredMovimentacoes, setFilteredMovimentacoes] = useState([]);
  const [filtro, setFiltro] = useState(0);
  const [anchorEls, setAnchorEls] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});
  /*

    filtro tem 4 valores possíveis:
     0 = todas as movimentações com type cautelado
     1 = todas as movimentações com type cautelado e status != devolvido
     2 = todas as movimentações com type cautelado e status == devolvido
     3 = todas as movimentações com type "saída"
  
  */

  const handleSelectMaterial = (material) => {
    setFilteredMovimentacoes([]); // Limpa as movimentações filtradas
    setMovimentacoes([]); // Limpa as movimentações
    setSelectedMaterial(material);
  };

  const handleClearSelection = () => {
    setSelectedMaterial(null);
    setMaterialCritery("");
    setFilteredMovimentacoes([]); // Limpa as movimentações filtradas
    setMovimentacoes([]); // Limpa as movimentações
  };

  useEffect(() => {
    const fetchMovimentacoes = async () => {
      const movimentacoesCollection = collection(db, "movimentacoes");
      const q = query(
        movimentacoesCollection,
        where("material", "==", selectedMaterial.id),
        orderBy("date", "desc")
      );
      console.log(selectedMaterial.id);
      const querySnapshot = await getDocs(q);

      const movimentacoes = [];
      querySnapshot.forEach((doc) => {
        movimentacoes.push({ id: doc.id, ...doc.data() });
      });

      setMovimentacoes(movimentacoes);
    };

    if (selectedMaterial) {
      fetchMovimentacoes();
    }
  }, [selectedMaterial]);

  useEffect(() => {
    if (movimentacoes.length > 0) {
      switch (filtro) {
        case 0:
          setFilteredMovimentacoes(movimentacoes);
          break;
        case 1:
          setFilteredMovimentacoes(movimentacoes.filter((mov) => mov.type === "cautela" && mov.status !== "devolvido"));
          break;
        case 2:
          setFilteredMovimentacoes(movimentacoes.filter((mov) => mov.type === "cautela" && mov.status === "devolvido"));
          break;
        case 3:
          setFilteredMovimentacoes(movimentacoes.filter((mov) => mov.type === "saída"));
          break;
        default:
          setFilteredMovimentacoes(movimentacoes);
      }
    }
  }, [movimentacoes, filtro]);

  const handleMouseEnter = (event, movId) => {
    // Limpa timer anterior se existir
    if (hoverTimers[movId]) {
      clearTimeout(hoverTimers[movId]);
    }

    // Configura um novo timer
    const timer = setTimeout(() => {
      setAnchorEls((prev) => ({
        ...prev,
        [movId]: {
          anchorEl: event.currentTarget,
          open: true,
        },
      }));
    }, 500); // 500ms = 0.5 segundo

    // Salva o timer para poder limpá-lo depois
    setHoverTimers((prev) => ({
      ...prev,
      [movId]: timer,
    }));
  };

  const handleMouseLeave = (movId) => {
    // Limpa o timer quando o mouse sai
    if (hoverTimers[movId]) {
      clearTimeout(hoverTimers[movId]);
    }

    setAnchorEls((prev) => ({
      ...prev,
      [movId]: {
        anchorEl: null,
        open: false,
      },
    }));
  };

  // Limpa todos os timers quando o componente é desmontado
  useEffect(() => {
    return () => {
      Object.values(hoverTimers).forEach(timer => clearTimeout(timer));
    };
  }, [hoverTimers]);

  const filterOptions = [
    { value: 0, label: "Todas", icon: <FilterIcon />, color: "default" },
    { value: 1, label: "Cautelas Abertas", icon: <AssignmentIcon />, color: "warning" },
    { value: 2, label: "Cautelas Devolvidas", icon: <CheckCircleIcon />, color: "success" },
    { value: 3, label: "Saídas", icon: <ExitIcon />, color: "info" }
  ];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'devolvido': return 'success';
      case 'cautelado': return 'warning';
      case 'saída': return 'info';
      default: return 'default';
    }
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'cautela': return 'primary';
      case 'saída': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3 } }}>
      <Fade in timeout={600}>
        <Box>
          <Card elevation={3} sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <SearchIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Pesquisa Material por Usuário
                </Typography>
              </Box>
              
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 3 }}>
                {selectedMaterial && (
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={handleClearSelection}
                    color="error"
                    sx={{ 
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    Limpar Seleção
                  </Button>
                )}
                {selectedMaterial && (
                  <Chip
                    icon={<PersonIcon />}
                    label={`Material Selecionado: ${selectedMaterial.description}`}
                    color="primary"
                    variant="filled"
                    sx={{ fontSize: '0.9rem' }}
                  />
                )}
              </Box>
              <MaterialSearch
                materialCritery={materialCritery}
                onSetMaterialCritery={setMaterialCritery}
                selectedItem={selectedMaterial}
                onSelectMaterial={handleSelectMaterial}
              />
              {selectedMaterial && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Filtros de Movimentação:
                  </Typography>
                  <RadioGroup
                    value={filtro}
                    onChange={(e) => setFiltro(Number(e.target.value))}
                    sx={{ gap: 1 }}
                  >
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' }, 
                      gap: 2 
                    }}>
                      {filterOptions.map((option) => (
                        <Card
                          key={option.value}
                          variant="outlined"
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: filtro === option.value ? 2 : 1,
                            borderColor: filtro === option.value 
                              ? `${option.color}.main` 
                              : 'divider',
                            backgroundColor: filtro === option.value 
                              ? `${option.color}.50` 
                              : 'background.paper',
                            '&:hover': {
                              transform: 'translateY(-1px)',
                              boxShadow: 2
                            },
                            borderRadius: 2
                          }}
                          onClick={() => setFiltro(option.value)}
                        >
                          <CardContent sx={{ p: 2, textAlign: 'center' }}>
                            <FormControlLabel
                              value={option.value}
                              control={
                                <Radio 
                                  color={option.color}
                                  size="small"
                                  sx={{ display: 'none' }}
                                />
                              }
                              label={
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ 
                                    color: `${option.color}.main`,
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}>
                                    {option.icon}
                                  </Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {option.label}
                                  </Typography>
                                </Box>
                              }
                              sx={{ margin: 0 }}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  </RadioGroup>
                </Box>
              )}
            </CardContent>
          </Card>
          {selectedMaterial && filteredMovimentacoes.length === 0 && movimentacoes.length === 0 && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <AlertTitle>Nenhuma movimentação encontrada</AlertTitle>
              Este material não possui movimentações registradas.
            </Alert>
          )}

          {selectedMaterial && filteredMovimentacoes.length > 0 && (
            <Card elevation={3} sx={{ borderRadius: 3, width: '100%', overflow: 'hidden' }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ 
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  p: 3,
                  borderRadius: '12px 12px 0 0'
                }}>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    Movimentações Encontradas ({filteredMovimentacoes.length})
                  </Typography>
                </Box>
                
                <Box sx={{ width: '100%', overflowX: 'auto' }}>
                  <Table sx={{ width: '100%', minWidth: 1000 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold', py: 2, minWidth: 180 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon fontSize="small" />
                          Militar
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 2, minWidth: 180 }}>
                        Viatura
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 2, minWidth: 120 }}>
                        Data
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 2, minWidth: 100 }}>
                        Tipo
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 2, minWidth: 140 }}>
                        Telefone
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', py: 2, minWidth: 120 }}>
                        Status
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredMovimentacoes.map((mov) => (
                      <TableRow
                        key={mov.id}
                        onMouseEnter={(e) => handleMouseEnter(e, mov.id)}
                        onMouseLeave={() => handleMouseLeave(mov.id)}
                        sx={{
                          '&:hover': {
                            backgroundColor: 'action.hover',
                            transform: 'scale(1.01)',
                            transition: 'all 0.2s ease'
                          },
                          '&:nth-of-type(even)': {
                            backgroundColor: 'grey.25'
                          },
                          cursor: 'pointer'
                        }}
                      >
                        <TableCell sx={{ py: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <PersonIcon color="primary" fontSize="small" />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {mov.user_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2">
                            {mov.viatura_description || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={new Date(mov.date.seconds * 1000).toLocaleDateString()}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={mov.type}
                            size="small"
                            color={getTypeColor(mov.type)}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2">
                            {mov.telefone_responsavel || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={mov.status}
                            size="small"
                            color={getStatusColor(mov.status)}
                            variant="filled"
                          />
                        </TableCell>

                        <Popover
                          id={`popover-${mov.id}`}
                          sx={{ pointerEvents: "none" }}
                          open={Boolean(anchorEls[mov.id]?.open)}
                          anchorEl={anchorEls[mov.id]?.anchorEl}
                          anchorOrigin={{ vertical: "center", horizontal: "right" }}
                          transformOrigin={{ vertical: "center", horizontal: "left" }}
                          onClose={() => handleMouseLeave(mov.id)}
                          disableRestoreFocus
                        >
                          <Card sx={{ maxWidth: 400, m: 1 }}>
                            <CardContent>
                              <Typography variant="h6" gutterBottom color="primary">
                                Detalhes da Movimentação
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {mov.id && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">ID:</Typography>
                                    <Typography variant="body2">{mov.id}</Typography>
                                  </Box>
                                )}
                                {mov.material_description && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">Material:</Typography>
                                    <Typography variant="body2">{mov.material_description}</Typography>
                                  </Box>
                                )}
                                {mov.quantity !== undefined && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">Quantidade:</Typography>
                                    <Typography variant="body2">{mov.quantity}</Typography>
                                  </Box>
                                )}
                                {mov.user_name && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">Militar:</Typography>
                                    <Typography variant="body2">{mov.user_name}</Typography>
                                  </Box>
                                )}
                                {mov.viatura_description && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">Viatura:</Typography>
                                    <Typography variant="body2">{mov.viatura_description}</Typography>
                                  </Box>
                                )}
                                {mov.date?.seconds && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">Data:</Typography>
                                    <Typography variant="body2">
                                      {new Date(mov.date.seconds * 1000).toLocaleString()}
                                    </Typography>
                                  </Box>
                                )}
                                {mov.telefone_responsavel && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">Telefone:</Typography>
                                    <Typography variant="body2">{mov.telefone_responsavel}</Typography>
                                  </Box>
                                )}
                                {mov.sender_name && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">Remetente:</Typography>
                                    <Typography variant="body2">{mov.sender_name}</Typography>
                                  </Box>
                                )}
                                {mov.signed !== undefined && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">Assinado:</Typography>
                                    <Chip 
                                      label={mov.signed ? "Sim" : "Não"} 
                                      size="small" 
                                      color={mov.signed ? "success" : "default"}
                                    />
                                  </Box>
                                )}
                                {mov.obs && (
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">Observações:</Typography>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                      {mov.obs}
                                    </Typography>
                                  </Box>
                                )}
                                {mov.motivo && (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Typography variant="body2" fontWeight="bold">Motivo:</Typography>
                                    <Typography variant="body2">{mov.motivo}</Typography>
                                  </Box>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </Popover>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          )}

          {selectedMaterial && filteredMovimentacoes.length > 0 && (
            <Tooltip title="Exportar para Excel" placement="left">
              <Fab
                color="success"
                size="medium"
                onClick={() => exportarMovimentacoes(
                  filteredMovimentacoes,
                  `movimentacoes_${selectedMaterial.description}`
                )}
                sx={{
                  position: 'fixed',
                  bottom: 120,
                  right: 24,
                  background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)',
                  boxShadow: 3,
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: 6
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <img src={excelIcon} alt="Exportar para Excel" width={24} />
              </Fab>
            </Tooltip>
          )}
        </Box>
      </Fade>
    </Box>
  );
}


/*
[{"material":"FSOG6yITzgN6ywCffJ9C","status":"devolvido","user":"x4V1bIy9joDZRRxgE7Zc","signed":true,"quantity":2,"type":"cautela","user_name":"Pablo","date":{"seconds":1741275738,"nanoseconds":262000000},"material_description":"Abafador","sender":"USfBN9ZrYXrHRdRcHw9g","sender_name":"user1"}]
Militar
*/