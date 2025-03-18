import { useEffect, useState } from "react";
import {
  Paper,
  Box,
  Switch,
  FormControlLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
  Fab,
  Popover,
  Typography,
} from "@mui/material";
import db from "../../firebase/db";
import { collection, query, where, getDocs } from "firebase/firestore";
import { exportarMovimentacoes } from "../../firebase/xlsx";
import excelIcon from "../../assets/excel.svg";

export default function Cautelados() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  // null: mostra todas, true: somente assinadas, false: somente não assinadas.
  const [filterSigned, setFilterSigned] = useState(null);
  const [anchorEls, setAnchorEls] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});

  useEffect(() => {
    const fetchMovimentacoes = async () => {
      const movimentacoesCollection = collection(db, "movimentacoes");
      const q = query(movimentacoesCollection, where("status", "==", "cautelado"));
      const querySnapshot = await getDocs(q);
      const movs = [];
      querySnapshot.forEach((doc) => {
        movs.push({ id: doc.id, ...doc.data() });
      });
      setMovimentacoes(movs);
    };

    fetchMovimentacoes();
  }, []);

  const filteredMovimentacoes =
    filterSigned === null
      ? movimentacoes
      : movimentacoes.filter((mov) => mov.signed === filterSigned);

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
    <Paper sx={{ padding: 2, marginTop: 5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={filterSigned === true}
              onChange={(e) =>
                setFilterSigned(e.target.checked ? true : null)
              }
              color="primary"
            />
          }
          label="Somente Assinadas"
        />
        <FormControlLabel
          control={
            <Switch
              checked={filterSigned === false}
              onChange={(e) =>
                setFilterSigned(e.target.checked ? false : null)
              }
              color="primary"
            />
          }
          label="Somente Não Assinadas"
        />
      </Box>

      <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Material
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Quantidade
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Data
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
                {mov.quantity}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.date?.seconds
                  ? new Date(mov.date.seconds * 1000).toLocaleDateString()
                  : ""}
              </TableCell>
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
                <Typography component="div" sx={{ p: 2, maxWidth: 350 }}>
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
                  {mov.date?.seconds && (
                    <div>
                      <strong>Data:</strong> {new Date(mov.date.seconds * 1000).toLocaleString()}
                    </div>
                  )}
                  {mov.signed !== undefined && (
                    <div>
                      <strong>Assinado:</strong> {mov.signed ? "Sim" : "Não"}
                    </div>
                  )}
                </Typography>
              </Popover>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Tooltip title="Exportar para Excel" placement="left">
        <Fab
          size="small"
          onClick={() =>
            exportarMovimentacoes(
              filteredMovimentacoes,
              `movimentacoes_cautelados`
            )
          }
          sx={{ position: "fixed", bottom: 100, right: 16 }}
        >
          <img src={excelIcon} alt="Exportar para Excel" width={20} />
        </Fab>
      </Tooltip>
    </Paper>
  );
}