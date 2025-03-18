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
  // Armazena a pesquisa que só retorna os não assinados
  const [movimentacoesNonSigned, setMovimentacoesNonSigned] = useState([]);
  // Armazena a pesquisa que retorna todos os documentos (status cautelado)
  const [movimentacoesAll, setMovimentacoesAll] = useState([]);
  // Se true, exibe somente os não assinados; false, exibe todos
  const [onlyNonSigned, setOnlyNonSigned] = useState(true);
  const [anchorEls, setAnchorEls] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});

  // Pesquisa inicial: somente não assinados
  useEffect(() => {
    const fetchNonSigned = async () => {
      const movimentacoesCollection = collection(db, "movimentacoes");
      const q = query(
        movimentacoesCollection,
        where("status", "==", "cautelado"),
        where("signed", "==", false)
      );
      const querySnapshot = await getDocs(q);
      const movs = [];
      querySnapshot.forEach((doc) => {
        movs.push({ id: doc.id, ...doc.data() });
      });
      setMovimentacoesNonSigned(movs);
    };

    fetchNonSigned();
  }, []);

  // Quando o usuário desmarca "somente não assinadas"
  // e se ainda não buscou todos, realiza nova pesquisa
  useEffect(() => {
    if (!onlyNonSigned && movimentacoesAll.length === 0) {
      const fetchAll = async () => {
        const movimentacoesCollection = collection(db, "movimentacoes");
        const q = query(movimentacoesCollection, where("status", "==", "cautelado"));
        const querySnapshot = await getDocs(q);
        const movs = [];
        querySnapshot.forEach((doc) => {
          movs.push({ id: doc.id, ...doc.data() });
        });
        setMovimentacoesAll(movs);
      };
      fetchAll();
    }
  }, [onlyNonSigned, movimentacoesAll]);

  // Exibe os dados conforme a opção do switch
  const displayedMovimentacoes = onlyNonSigned
    ? movimentacoesNonSigned
    : movimentacoesAll;

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

  useEffect(() => {
    return () => {
      Object.values(hoverTimers).forEach((timer) => clearTimeout(timer));
    };
  }, [hoverTimers]);

  return (
    <Paper sx={{ padding: 2, marginTop: 5 }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={onlyNonSigned}
              onChange={(e) => setOnlyNonSigned(e.target.checked)}
              color="primary"
            />
          }
          label="Exibir somente não assinadas"
        />
      </Box>

      <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Material
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Militar
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Quantidade
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Data
            </TableCell>
            <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
              Assinado
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayedMovimentacoes.map((mov) => (
            <TableRow
              key={mov.id}
              onMouseEnter={(e) => handleMouseEnter(e, mov.id)}
              onMouseLeave={() => handleMouseLeave(mov.id)}
              hover
            >
              <TableCell sx={{ textAlign: "left" }}>{mov.material_description}</TableCell>
              <TableCell sx={{ textAlign: "left" }}>{mov.user_name}</TableCell>
              <TableCell sx={{ textAlign: "left" }}>{mov.quantity}</TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.date?.seconds ? new Date(mov.date.seconds * 1000).toLocaleDateString() : ""}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.signed !== undefined ? (mov.signed ? "Sim" : "Não") : ""}
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
                  {mov.material && (<div><strong>Material ID:</strong> {mov.material}</div>)}
                  {mov.material_description && (<div><strong>Material:</strong> {mov.material_description}</div>)}
                  {mov.quantity !== undefined && (<div><strong>Quantidade:</strong> {mov.quantity}</div>)}
                  {mov.user_name && (<div><strong>Militar:</strong> {mov.user_name}</div>)}
                  {mov.user && (<div><strong>ID Militar:</strong> {mov.user}</div>)}
                  {mov.date?.seconds && (
                    <div>
                      <strong>Data:</strong> {new Date(mov.date.seconds * 1000).toLocaleString()}
                    </div>
                  )}
                  {mov.signed !== undefined && (
                    <div><strong>Assinado:</strong> {mov.signed ? "Sim" : "Não"}</div>
                  )}
                  {mov.type && (<div><strong>Tipo:</strong> {mov.type}</div>)}
                  {mov.status && (<div><strong>Status:</strong> {mov.status}</div>)}
                  {mov.sender_name && (<div><strong>Remetente:</strong> {mov.sender_name}</div>)}
                  {mov.obs && (<div><strong>Observações:</strong> {mov.obs}</div>)}
                  {mov.motivo && (<div><strong>Motivo:</strong> {mov.motivo}</div>)}
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
            exportarMovimentacoes(displayedMovimentacoes, `movimentacoes_cautelados`)
          }
          sx={{ position: "fixed", bottom: 100, right: 16 }}
        >
          <img src={excelIcon} alt="Exportar para Excel" width={20} />
        </Fab>
      </Tooltip>
    </Paper>
  );
}