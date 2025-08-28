import { useEffect, useState } from "react";
import UserSearch from "../../components/UserSearch";
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Popover,
  Typography,
  Card,
  CardContent
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import db from "../../firebase/db";
import { query, collection, where, getDocs, orderBy } from "firebase/firestore";
import { exportarMovimentacoes } from "../../firebase/xlsx";
import excelIcon from "../../assets/excel.svg";

export default function UsuarioMaterial({ categorias }) {
  const [userCritery, setUserCritery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [filteredMovimentacoes, setFilteredMovimentacoes] = useState([]);
  const [filtro, setFiltro] = useState(0);
  const [categoriaFilter, setCategoriaFilter] = useState("");

  // Estados para o Popover
  const [anchorEls, setAnchorEls] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});

  const handleSelectUser = (user) => {
    setFilteredMovimentacoes([]);
    setMovimentacoes([]);
    setSelectedUser(user);
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setUserCritery("");
    setFilteredMovimentacoes([]);
    setMovimentacoes([]);
  };

  useEffect(() => {
    const fetchMovimentacoes = async () => {
      if (!selectedUser) return;
      const movimentacoesCollection = collection(db, "movimentacoes");
      const q = query(
        movimentacoesCollection,
        where("user", "==", selectedUser.id),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(q);
      const movs = [];
      querySnapshot.forEach((doc) => {
        // Inclui o id para cada movimentação
        movs.push({ id: doc.id, ...doc.data() });
      });
      setMovimentacoes(movs);
    };

    fetchMovimentacoes();
  }, [selectedUser]);

  useEffect(() => {
    if (movimentacoes.length > 0) {
      let filtered = movimentacoes;

      switch (filtro) {
        case 1:
          filtered = filtered.filter(
            (mov) => mov.type === "cautela" && mov.status !== "devolvido"
          );
          break;
        case 2:
          filtered = filtered.filter(
            (mov) => mov.type === "cautela" && mov.status === "devolvido"
          );
          break;
        case 3:
          filtered = filtered.filter((mov) => mov.type === "saída");
          break;
        default:
          break;
      }

      if (categoriaFilter) {
        filtered = filtered.filter((mov) => mov.categoria === categoriaFilter);
      }

      setFilteredMovimentacoes(filtered);
    }
  }, [movimentacoes, filtro, categoriaFilter]);

  const handleMouseEnter = (event, movId) => {
    if (hoverTimers[movId]) {
      clearTimeout(hoverTimers[movId]);
    }
    const timer = setTimeout(() => {
      setAnchorEls((prev) => ({
        ...prev,
        [movId]: {
          anchorEl: event.currentTarget,
          open: true,
        },
      }));
    }, 500);
    setHoverTimers((prev) => ({
      ...prev,
      [movId]: timer,
    }));
  };

  const handleMouseLeave = (movId) => {
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

  // Limpa os timers ao desmontar o componente
  useEffect(() => {
    return () => {
      Object.values(hoverTimers).forEach((timer) => clearTimeout(timer));
    };
  }, [hoverTimers]);

  return (
    <Box sx={{ width: '100%', px: { xs: 1, sm: 2, md: 3 } }}>
      <Card elevation={3} sx={{ borderRadius: 3, mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            marginBottom: 2,
          }}
        >
          {selectedUser && (
            <Button
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={handleClearSelection}
              size="small"
            >
              Limpar Seleção
            </Button>
          )}
        </Box>

        <UserSearch
          userCritery={userCritery}
          onSetUserCritery={setUserCritery}
          selectedItem={selectedUser}
          onSelectUser={handleSelectUser}
        />

        {selectedUser && (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <RadioGroup
              sx={{
                display: "flex",
                gap: 2,
                flexDirection: "row",
                justifyContent: "center",
              }}
              value={filtro}
              onChange={(e) => setFiltro(Number(e.target.value))}
            >
              <FormControlLabel value={0} control={<Radio />} label="Todas" />
              <FormControlLabel
                value={1}
                control={<Radio />}
                label="Cautelas/Aberto"
              />
              <FormControlLabel
                value={2}
                control={<Radio />}
                label="Cautelas/Devolvido"
              />
              <FormControlLabel value={3} control={<Radio />} label="Saida" />
            </RadioGroup>

            <FormControl sx={{ m: 1, minWidth: 120 }}>
              <InputLabel id="categoria-select-label">Categoria</InputLabel>
              <Select
                labelId="categoria-select-label"
                size="small"
                fullWidth
                id="categoria-select"
                value={categoriaFilter}
                label="Categoria"
                onChange={(e) => setCategoriaFilter(e.target.value)}
              >
                <MenuItem value="">
                  <em>Todas</em>
                </MenuItem>
                {categorias.map((categoria) => (
                  <MenuItem
                    key={categoria.description}
                    value={categoria.description}
                  >
                    {categoria.description}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        <Table size="small" sx={{ marginTop: 2, width: "100%", tableLayout: "fixed" }}>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  textAlign: "left",
                  backgroundColor: "#ddeeee",
                  fontWeight: "bold",
                }}
              >
                Material
              </TableCell>
              <TableCell
                sx={{
                  textAlign: "left",
                  backgroundColor: "#ddeeee",
                  fontWeight: "bold",
                }}
              >
                Viatura
              </TableCell>
              <TableCell
                sx={{
                  textAlign: "left",
                  backgroundColor: "#ddeeee",
                  fontWeight: "bold",
                }}
              >
                Data
              </TableCell>
              <TableCell
                sx={{
                  textAlign: "left",
                  backgroundColor: "#ddeeee",
                  fontWeight: "bold",
                }}
              >
                Tipo
              </TableCell>
              <TableCell
                sx={{
                  textAlign: "left",
                  backgroundColor: "#ddeeee",
                  fontWeight: "bold",
                }}
              >
                Telefone
              </TableCell>
              <TableCell
                sx={{
                  textAlign: "left",
                  backgroundColor: "#ddeeee",
                  fontWeight: "bold",
                }}
              >
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
                hover
              >
                <TableCell sx={{ textAlign: "left" }}>
                  {mov.material_description}
                </TableCell>
                <TableCell sx={{ textAlign: "left" }}>
                  {mov.viatura_description}
                </TableCell>
                <TableCell sx={{ textAlign: "left" }}>
                  {mov.date?.seconds ? new Date(mov.date.seconds * 1000).toLocaleDateString() : ""}
                </TableCell>
                <TableCell sx={{ textAlign: "left" }}>{mov.type}</TableCell>
                <TableCell sx={{ textAlign: "left" }}>
                  {mov.telefone_responsavel}
                </TableCell>
                <TableCell sx={{ textAlign: "left" }}>{mov.status}</TableCell>
                <Popover
                  id={`popover-${mov.id}`}
                  sx={{ pointerEvents: "none" }}
                  open={Boolean(anchorEls[mov.id]?.open)}
                  anchorEl={anchorEls[mov.id]?.anchorEl}
                  anchorOrigin={{
                    vertical: "center",
                    horizontal: "right",
                  }}
                  transformOrigin={{
                    vertical: "center",
                    horizontal: "left",
                  }}
                  onClose={() => handleMouseLeave(mov.id)}
                  disableRestoreFocus
                >
                  <Typography component={"div"} sx={{ p: 2, maxWidth: 350 }}>
                    {mov.id && <div><strong>ID:</strong> {mov.id}</div>}
                    {mov.material && (
                      <div>
                        <strong>Material ID:</strong> {mov.material}
                      </div>
                    )}
                    {mov.material_description && (
                      <div>
                        <strong>Material:</strong> {mov.material_description}
                      </div>
                    )}
                    {mov.quantity !== undefined && (
                      <div>
                        <strong>Quantidade:</strong> {mov.quantity}
                      </div>
                    )}
                    {mov.user_name && (
                      <div>
                        <strong>Militar:</strong> {mov.user_name}
                      </div>
                    )}
                    {mov.user && (
                      <div>
                        <strong>ID Militar:</strong> {mov.user}
                      </div>
                    )}
                    {mov.viatura_description && (
                      <div>
                        <strong>Viatura:</strong> {mov.viatura_description}
                      </div>
                    )}
                    {mov.date?.seconds && (
                      <div>
                        <strong>Data:</strong>{" "}
                        {new Date(mov.date.seconds * 1000).toLocaleString()}
                      </div>
                    )}
                    {mov.type && (
                      <div>
                        <strong>Tipo:</strong> {mov.type}
                      </div>
                    )}
                    {mov.status && (
                      <div>
                        <strong>Status:</strong> {mov.status}
                      </div>
                    )}
                    {mov.telefone_responsavel && (
                      <div>
                        <strong>Telefone:</strong> {mov.telefone_responsavel}
                      </div>
                    )}
                    {mov.sender_name && (
                      <div>
                        <strong>Remetente:</strong> {mov.sender_name}
                      </div>
                    )}
                    {mov.sender && (
                      <div>
                        <strong>ID Remetente:</strong> {mov.sender}
                      </div>
                    )}
                    {mov.signed !== undefined && (
                      <div>
                        <strong>Assinado:</strong> {mov.signed ? "Sim" : "Não"}
                      </div>
                    )}
                    {mov.obs && (
                      <div>
                        <strong>Observações:</strong> {mov.obs}
                      </div>
                    )}
                    {mov.motivo && (
                      <div>
                        <strong>Motivo:</strong> {mov.motivo}
                      </div>
                    )}
                  </Typography>
                </Popover>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      {selectedUser && filteredMovimentacoes.length > 0 && (
        <Tooltip title="Exportar para Excel" placement="left">
          <Fab
            size="small"
            onClick={() =>
              exportarMovimentacoes(
                filteredMovimentacoes,
                `movimentacoes_${selectedUser.name}`
              )
            }
            sx={{
              position: "fixed",
              bottom: 100,
              right: 16,
            }}
          >
            <img src={excelIcon} alt="Exportar para Excel" width={20} />
          </Fab>
        </Tooltip>
      )}
    </Box>
  );
}