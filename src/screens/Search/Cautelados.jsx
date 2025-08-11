import { useEffect, useState } from "react";
import {
  Paper,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
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
  // Filtro: 0=todos, 1=assinados, 2=devolvidos, 3=não assinados
  const [filtro, setFiltro] = useState(0);
  // Cache local: a chave é o valor do filtro
  // e o valor é o array de movimentações para aquela combinação.
  const [cachedMovimentacoes, setCachedMovimentacoes] = useState({});
  // Estados para o Popover relativo aos detalhes
  const [anchorEls, setAnchorEls] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});

  // Efeito para realizar a consulta ao Firestore caso o filtro não esteja em cache
  useEffect(() => {
    if (!(filtro in cachedMovimentacoes)) {
      const fetchData = async () => {
        const movimentacoesCollection = collection(db, "movimentacoes");
        let constraints = [];
        
        switch (filtro) {
          case 0: // Todos - busca todas as movimentações de cautela (incluindo devolvidos)
            constraints = [];
            break;
          case 1: // Assinados
            constraints = [
              where("status", "==", "cautelado"),
              where("signed", "==", true)
            ];
            break;
          case 2: // Devolvidos
            constraints = [where("status", "==", "devolvido")];
            break;
          case 3: // Não assinados
            constraints = [
              where("status", "==", "cautelado"),
              where("signed", "==", false)
            ];
            break;
          default:
            constraints = [];
        }
        
        let querySnapshot;
        if (constraints.length === 0) {
          // Para "Todos", busca todas as movimentações de cautela (incluindo devolvidas)
          const qCautelado = query(movimentacoesCollection, where("type", "==", "cautela"));
          querySnapshot = await getDocs(qCautelado);
        } else {
          const q = query(movimentacoesCollection, ...constraints);
          querySnapshot = await getDocs(q);
        }
        
        const movs = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Para "Todos", incluir apenas movimentações de cautela
          if (filtro === 0) {
            if (data.type === "cautela") {
              movs.push({ id: doc.id, ...data });
            }
          } else {
            movs.push({ id: doc.id, ...data });
          }
        });
        console.log(movs);
        setCachedMovimentacoes((prev) => ({ ...prev, [filtro]: movs }));
      };
      fetchData();
    }
  }, [filtro, cachedMovimentacoes]);
 
  // Movimentações a serem exibidas, de acordo com o cache
  const displayedMovimentacoes = cachedMovimentacoes[filtro] || [];

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
    <Paper sx={{ padding: 2, marginTop: 5, minHeight: '80vh' }}>
      <Box sx={{ mb: 3 }}>
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
          <FormControlLabel 
            value={0} 
            control={<Radio />} 
            label="Todos" 
          />
          <FormControlLabel 
            value={1} 
            control={<Radio sx={{ color: 'blue', '&.Mui-checked': { color: 'blue' } }} />} 
            label="Assinados"
            sx={{ color: 'blue' }}
          />
          <FormControlLabel 
            value={2} 
            control={<Radio sx={{ color: 'green', '&.Mui-checked': { color: 'green' } }} />} 
            label="Devolvidos"
            sx={{ color: 'green' }}
          />
          <FormControlLabel 
            value={3} 
            control={<Radio sx={{ color: 'red', '&.Mui-checked': { color: 'red' } }} />} 
            label="Não Assinados"
            sx={{ color: 'red' }}
          />
        </RadioGroup>
      </Box>

      <Table size="small" sx={{ width: "100%", tableLayout: "fixed", mt: 2 }}>
        <TableHead>
          <TableRow>
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
          {displayedMovimentacoes.map((mov) => (
            <TableRow
              key={mov.id}
              onMouseEnter={(e) => handleMouseEnter(e, mov.id)}
              onMouseLeave={() => handleMouseLeave(mov.id)}
              hover
              sx={{
                backgroundColor: 
                  mov.status === 'devolvido' ? 'rgba(0, 128, 0, 0.1)' : // Verde claro para devolvidos
                  mov.signed === false ? 'rgba(255, 0, 0, 0.1)' : // Vermelho claro para não assinados
                  mov.signed === true ? 'rgba(0, 0, 255, 0.1)' : // Azul claro para assinados
                  'transparent',
                '&:hover': {
                  backgroundColor: 
                    mov.status === 'devolvido' ? 'rgba(0, 128, 0, 0.2)' : 
                    mov.signed === false ? 'rgba(255, 0, 0, 0.2)' : 
                    mov.signed === true ? 'rgba(0, 0, 255, 0.2)' : 
                    'rgba(0, 0, 0, 0.04)',
                }
              }}
            >
              <TableCell sx={{ textAlign: "left" }}>
                {mov.user_name || "-"}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.viatura_description || "-"}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.date?.seconds
                  ? new Date(mov.date.seconds * 1000).toLocaleDateString()
                  : "-"}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.type || "-"}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.telefone_responsavel || "-"}
              </TableCell>
              <TableCell sx={{ textAlign: "left" }}>
                {mov.status || "-"}
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
                  {mov.viatura_description && (
                    <div>
                      <strong>Viatura:</strong> {mov.viatura_description}
                    </div>
                  )}
                  {mov.date?.seconds && (
                    <div>
                      <strong>Data:</strong> {new Date(mov.date.seconds * 1000).toLocaleString()}
                    </div>
                  )}
                  {mov.type && (
                    <div>
                      <strong>Tipo:</strong> {mov.type}
                    </div>
                  )}
                  {mov.telefone_responsavel && (
                    <div>
                      <strong>Telefone:</strong> {mov.telefone_responsavel}
                    </div>
                  )}
                  {mov.status && (
                    <div>
                      <strong>Status:</strong> {mov.status}
                    </div>
                  )}
                  {mov.signed !== undefined && (
                    <div>
                      <strong>Assinado:</strong> {mov.signed ? "Sim" : "Não"}
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