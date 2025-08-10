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
  // Controle para filtrar apenas os não assinados (true por default)
  const [onlyNonSigned, setOnlyNonSigned] = useState(true);
  // Controle para filtrar apenas movimentações sem viatura (true por default)
  const [onlyWithoutViatura, setOnlyWithoutViatura] = useState(true);
  // Cache local: a chave é uma string formada por `${onlyNonSigned}-${onlyWithoutViatura}`
  // e o valor é o array de movimentações para aquela combinação.
  const [cachedMovimentacoes, setCachedMovimentacoes] = useState({});
  // Estados para o Popover relativo aos detalhes
  const [anchorEls, setAnchorEls] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});

  // Efeito para realizar a consulta ao Firestore caso a combinação de filtros não esteja em cache
  useEffect(() => {
    const key = `${onlyNonSigned}-${onlyWithoutViatura}`;
    if (!(key in cachedMovimentacoes)) {
    
      const fetchData = async () => {
        const movimentacoesCollection = collection(db, "movimentacoes");
        const constraints = [where("status", "==", "cautelado")];
        if (onlyWithoutViatura) {
          constraints.push(where("viatura", "==", null));
        }
        if (onlyNonSigned) {
          constraints.push(where("signed", "==", false));
        }
        const q = query(movimentacoesCollection, ...constraints);
        const querySnapshot = await getDocs(q);
        const movs = [];
        querySnapshot.forEach((doc) => {
          movs.push({ id: doc.id, ...doc.data() });
        });
        console.log[movs]
        setCachedMovimentacoes((prev) => ({ ...prev, [key]: movs }));
      };
      fetchData();
    }
  }, [onlyNonSigned, onlyWithoutViatura, cachedMovimentacoes]);
 
  // Movimentações a serem exibidas, de acordo com o cache
  const displayedMovimentacoes =
    cachedMovimentacoes[`${onlyNonSigned}-${onlyWithoutViatura}`] || [];

  // Lógica para exibir o Popover após 0,5s de hover
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mb: 2,
          gap: 2,
        }}
      >
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
        <FormControlLabel
          control={
            <Switch
              checked={onlyWithoutViatura}
              onChange={(e) => setOnlyWithoutViatura(e.target.checked)}
              color="primary"
            />
          }
          label="Exibir somente sem viatura"
        />
      </Box>

      <Table size="small" sx={{ width: "100%", tableLayout: "fixed" }}>
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
              Militar
            </TableCell>
            <TableCell
              sx={{
                textAlign: "left",
                backgroundColor: "#ddeeee",
                fontWeight: "bold",
              }}
            >
              Quantidade
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
              <TableCell sx={{ textAlign: "left" }}>
                {mov.material_description}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.user_name}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>{mov.quantity}</TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.date?.seconds
                  ? new Date(mov.date.seconds * 1000).toLocaleDateString()
                  : ""}
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
                  {mov.sender_name && (
                    <div>
                      <strong>Remetente:</strong> {mov.sender_name}
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
      <Tooltip title="Exportar para Excel" placement="left">
        <Fab
          size="small"
          onClick={() =>
            exportarMovimentacoes(
              displayedMovimentacoes,
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