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
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import db from "../../firebase/db";
import { query, collection, where, getDocs } from "firebase/firestore";
import { exportarMovimentacoes } from "../../firebase/xlsx";
import excelIcon from "../../assets/excel.svg";

export default function UsuarioMaterial({ categorias }) {
  const [userCritery, setUserCritery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [filteredMovimentacoes, setFilteredMovimentacoes] = useState([]);
  const [filtro, setFiltro] = useState(0);
  const [categoriaFilter, setCategoriaFilter] = useState("");

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
        where("user", "==", selectedUser.id)
      );
      const querySnapshot = await getDocs(q);
      const movimentacoes = [];
      querySnapshot.forEach((doc) => {
        movimentacoes.push(doc.data());
      });
      setMovimentacoes(movimentacoes);
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

  return (
    <div>
      <Paper sx={{ padding: 2, marginTop: 5 }}>
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
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
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
                  <MenuItem key={categoria.description} value={categoria.description}>
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
              <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                Material
              </TableCell>
              <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                Viatura
              </TableCell>
              <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                Data
              </TableCell>
              <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                Tipo
              </TableCell>
              <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                Telefone
              </TableCell>
              <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMovimentacoes.map((mov) => (
              <TableRow key={mov.id}>
                <TableCell sx={{ textAlign: "left" }}>
                  {mov.material_description}
                </TableCell>
                <TableCell sx={{ textAlign: "left" }}>
                  {mov.viatura_description}
                </TableCell>
                <TableCell sx={{ textAlign: "left" }}>
                  {new Date(mov.date.seconds * 1000).toLocaleDateString()}
                </TableCell>
                <TableCell sx={{ textAlign: "left" }}>
                  {mov.type}
                </TableCell>
                <TableCell sx={{ textAlign: "left" }}>
                  {mov.telefone_responsavel}
                </TableCell>
                <TableCell sx={{ textAlign: "left" }}>
                  {mov.status}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

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
    </div>
  );
}