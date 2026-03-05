import UserSearch from "../../components/UserSearch";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import { useState, useEffect, useMemo } from "react";
import { verifyToken } from "../../firebase/token";
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Switch,
  FormControlLabel,
  Paper,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  alpha,
  useTheme,
  useMediaQuery,
  Collapse,
  Fade,
  Skeleton,
  Badge,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Divider,
} from "@mui/material";
import {
  AssignmentReturn,
  Build,
  Person,
  CalendarToday,
  Inventory2,
  CheckCircle,
  Info,
  SearchOff,
  SwapHoriz,
  Notes,
  WarningAmber,
} from "@mui/icons-material";
import db from "../../firebase/db";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function Devolucoes() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const [userRole, setUserRole] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [includeReparo, setIncludeReparo] = useState(false);
  const [userCritery, setUserCritery] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, item: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem("token");
      const user = await verifyToken(token);
      setUserRole(user.role);
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (!selectedUser && !includeReparo) {
      setMovimentacoes([]);
      return;
    }

    const fetchMovimentacoes = async () => {
      setLoading(true);
      try {
        let q;
        if (includeReparo) {
          q = query(
            collection(db, "movimentacoes"),
            where("type", "==", "reparo")
          );
        } else {
          q = query(
            collection(db, "movimentacoes"),
            where("user", "==", selectedUser.id),
            where("type", "==", "cautela")
          );
        }

        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((docSnap) => {
          results.push({
            id: docSnap.id,
            ...docSnap.data(),
          });
        });
        setMovimentacoes(results);
      } catch (error) {
        console.error("Erro ao buscar movimentacoes:", error);
        setSnackbar({ open: true, message: "Erro ao buscar movimentacoes.", severity: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchMovimentacoes();
  }, [selectedUser, includeReparo]);

  const { pendentes, devolvidos } = useMemo(() => {
    const p = [];
    const d = [];
    movimentacoes.forEach((m) => {
      if (m.status === "devolvido" || m.status === "devolvidaDeReparo") {
        d.push(m);
      } else {
        p.push(m);
      }
    });
    return { pendentes: p, devolvidos: d };
  }, [movimentacoes]);

  const handleDevolver = async (movimentacao) => {
    try {
      const docRef = doc(db, "movimentacoes", movimentacao.id);
      const newStatus = includeReparo ? "devolvidaDeReparo" : "devolvido";
      await updateDoc(docRef, {
        status: newStatus,
        returned_date: serverTimestamp(),
        user_acknowledged_return: false,
      });

      const materialId = movimentacao.material;
      const docRefMaterial = doc(db, "materials", materialId);
      const materialSnap = await getDoc(docRefMaterial);

      if (materialSnap.exists()) {
        const materialData = materialSnap.data();
        const quantidadeDevolvida = movimentacao.quantity;
        const quantidadeAtual = materialData.estoque_atual || 0;
        const novaQuantidade = quantidadeAtual + quantidadeDevolvida;

        await updateDoc(docRefMaterial, {
          estoque_atual: novaQuantidade,
        });
      }

      setMovimentacoes((prev) =>
        prev.map((m) =>
          m.id === movimentacao.id
            ? { ...m, status: newStatus, returned_date: new Date() }
            : m
        )
      );

      setSnackbar({
        open: true,
        message: `"${movimentacao.material_description}" devolvido com sucesso!`,
        severity: "success",
      });
    } catch (error) {
      console.error("Erro ao devolver material:", error);
      setSnackbar({ open: true, message: "Erro ao devolver material.", severity: "error" });
    }
  };

  const handleConfirmDevolver = () => {
    if (confirmDialog.item) {
      handleDevolver(confirmDialog.item);
    }
    setConfirmDialog({ open: false, item: null });
  };

  const formatDate = (date) => {
    if (!date) return "-";
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const getStatusChip = (status) => {
    const isDevolvido = status === "devolvido" || status === "devolvidaDeReparo";
    return (
      <Chip
        icon={isDevolvido ? <CheckCircle sx={{ fontSize: 16 }} /> : <SwapHoriz sx={{ fontSize: 16 }} />}
        label={isDevolvido ? "Devolvido" : "Pendente"}
        size="small"
        sx={{
          fontWeight: 600,
          fontSize: "0.75rem",
          backgroundColor: isDevolvido
            ? alpha(theme.palette.success.main, 0.12)
            : alpha(theme.palette.warning.main, 0.12),
          color: isDevolvido ? theme.palette.success.dark : theme.palette.warning.dark,
          border: `1px solid ${isDevolvido
            ? alpha(theme.palette.success.main, 0.3)
            : alpha(theme.palette.warning.main, 0.3)
          }`,
          "& .MuiChip-icon": {
            color: "inherit",
          },
        }}
      />
    );
  };

  const renderMobileCard = (movimentacao, isPendente) => (
    <Card
      key={movimentacao.id}
      sx={{
        mb: 1.5,
        border: `1px solid ${alpha(
          isPendente ? theme.palette.warning.main : theme.palette.success.main,
          0.2
        )}`,
        backgroundColor: alpha(
          isPendente ? theme.palette.warning.main : theme.palette.success.main,
          0.02
        ),
        "&:hover": { transform: "none", boxShadow: theme.shadows[2] },
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1, mr: 1 }}>
            {movimentacao.material_description}
          </Typography>
          {getStatusChip(movimentacao.status)}
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              {formatDate(movimentacao.date)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Inventory2 sx={{ fontSize: 14, color: "text.secondary" }} />
            <Typography variant="caption" color="text.secondary">
              Qtd: {movimentacao.quantity}
            </Typography>
          </Box>
        </Stack>

        {movimentacao.observacoes && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5, mb: 1 }}>
            <Notes sx={{ fontSize: 14, color: "text.secondary", mt: 0.3 }} />
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-word" }}>
              {movimentacao.observacoes}
            </Typography>
          </Box>
        )}

        {isPendente && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AssignmentReturn />}
              onClick={() => setConfirmDialog({ open: true, item: movimentacao })}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              }}
            >
              Devolver
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderTable = (items, isPendente) => (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            <TableCell sx={{ color: "white", fontWeight: 600, py: 1.5 }}>Material</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600, py: 1.5 }} align="center">Data</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600, py: 1.5 }} align="center">Qtd</TableCell>
            {!isTablet && (
              <TableCell sx={{ color: "white", fontWeight: 600, py: 1.5 }}>Obs</TableCell>
            )}
            <TableCell sx={{ color: "white", fontWeight: 600, py: 1.5 }} align="center">Status</TableCell>
            {isPendente && (
              <TableCell sx={{ color: "white", fontWeight: 600, py: 1.5 }} align="center">Acao</TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isPendente ? 6 : 5} align="center" sx={{ py: 4 }}>
                <CheckCircle sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {isPendente ? "Nenhum item pendente de devolucao" : "Nenhuma devolucao registrada"}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            items.map((mov, index) => (
              <TableRow
                key={mov.id}
                sx={{
                  backgroundColor: index % 2 === 0 ? "transparent" : alpha(theme.palette.primary.main, 0.02),
                  "&:hover": { backgroundColor: alpha(theme.palette.primary.main, 0.06) },
                  transition: "background-color 0.15s",
                }}
              >
                <TableCell sx={{ py: 1.5 }}>
                  <Typography variant="body2" fontWeight={500}>
                    {mov.material_description}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(mov.date)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={mov.quantity}
                    size="small"
                    sx={{
                      minWidth: 32,
                      fontWeight: 600,
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main,
                    }}
                  />
                </TableCell>
                {!isTablet && (
                  <TableCell sx={{ maxWidth: 200, wordBreak: "break-word" }}>
                    <Typography variant="body2" color="text.secondary">
                      {mov.observacoes || "-"}
                    </Typography>
                  </TableCell>
                )}
                <TableCell align="center">{getStatusChip(mov.status)}</TableCell>
                {isPendente && (
                  <TableCell align="center">
                    <Tooltip title="Devolver material" arrow>
                      <IconButton
                        size="small"
                        onClick={() => setConfirmDialog({ open: true, item: mov })}
                        sx={{
                          color: theme.palette.primary.main,
                          backgroundColor: alpha(theme.palette.primary.main, 0.08),
                          "&:hover": {
                            backgroundColor: alpha(theme.palette.primary.main, 0.16),
                            transform: "scale(1.1)",
                          },
                          transition: "all 0.2s",
                        }}
                      >
                        <AssignmentReturn fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderSkeletons = () => (
    <Box sx={{ mt: 3 }}>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} variant="rounded" height={56} sx={{ mb: 1, borderRadius: 2 }} />
      ))}
    </Box>
  );

  const renderEmptyState = () => (
    <Fade in>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 8,
          px: 3,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
          }}
        >
          {includeReparo ? (
            <Build sx={{ fontSize: 36, color: theme.palette.primary.light }} />
          ) : (
            <Person sx={{ fontSize: 36, color: theme.palette.primary.light }} />
          )}
        </Box>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          {includeReparo ? "Modo Reparos Ativo" : "Selecione um militar"}
        </Typography>
        <Typography variant="body2" color="text.disabled" textAlign="center" maxWidth={360}>
          {includeReparo
            ? "As movimentacoes de reparo serao exibidas automaticamente."
            : "Pesquise e selecione um militar acima para visualizar suas cautelas pendentes de devolucao."}
        </Typography>
      </Box>
    </Fade>
  );

  const hasResults = selectedUser || includeReparo;

  return (
    <PrivateRoute>
      <MenuContext>
        <div className="root-protected">
          {userRole === "admin" || userRole === "editor" || userRole === "admingeral" ? (
            <Box sx={{ maxWidth: 1200, mx: "auto" }}>
              {/* Header */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "text.primary",
                    mb: 0.5,
                  }}
                >
                  Devoluções
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gerencie as devoluções de materiais cautelados
                </Typography>
              </Box>

              {/* Toggle Reparo + Search */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 3,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 3,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: includeReparo ? 0 : 2.5,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Build sx={{ fontSize: 20, color: includeReparo ? theme.palette.secondary.main : "text.disabled" }} />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={includeReparo}
                          onChange={(e) => {
                            setIncludeReparo(e.target.checked);
                            if (e.target.checked) {
                              setSelectedUser(null);
                              setUserCritery("");
                            }
                          }}
                          color="secondary"
                        />
                      }
                      label={
                        <Typography variant="body2" fontWeight={500}>
                          Modo Reparos
                        </Typography>
                      }
                    />
                  </Box>

                  {hasResults && (
                    <Fade in>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Badge badgeContent={pendentes.length} color="warning" max={99}>
                          <Chip
                            label="Pendentes"
                            size="small"
                            variant={pendentes.length > 0 ? "filled" : "outlined"}
                            sx={{
                              fontWeight: 600,
                              backgroundColor: pendentes.length > 0
                                ? alpha(theme.palette.warning.main, 0.12)
                                : "transparent",
                              color: theme.palette.warning.dark,
                              borderColor: alpha(theme.palette.warning.main, 0.3),
                            }}
                          />
                        </Badge>
                        <Badge badgeContent={devolvidos.length} color="success" max={99}>
                          <Chip
                            label="Devolvidos"
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              borderColor: alpha(theme.palette.success.main, 0.3),
                              color: theme.palette.success.dark,
                            }}
                          />
                        </Badge>
                      </Box>
                    </Fade>
                  )}
                </Box>

                <Collapse in={!includeReparo}>
                  <UserSearch
                    onSelectUser={setSelectedUser}
                    userCritery={userCritery}
                    onSetUserCritery={setUserCritery}
                  />
                </Collapse>
              </Paper>

              {/* Selected user info bar */}
              <Collapse in={!!selectedUser && !includeReparo}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 3,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    borderRadius: 3,
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Person sx={{ color: theme.palette.primary.main }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={600} noWrap>
                      {selectedUser?.full_name}
                    </Typography>
                    {selectedUser?.OBM && (
                      <Typography variant="caption" color="text.secondary">
                        {selectedUser.OBM}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={`${movimentacoes.length} cautela${movimentacoes.length !== 1 ? "s" : ""}`}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main,
                    }}
                  />
                </Paper>
              </Collapse>

              {/* Content area */}
              {loading ? (
                renderSkeletons()
              ) : !hasResults ? (
                renderEmptyState()
              ) : (
                <Fade in>
                  <Box>
                    {/* Pendentes Section */}
                    {pendentes.length > 0 && (
                      <Box sx={{ mb: 4 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                          <WarningAmber sx={{ fontSize: 20, color: theme.palette.warning.main }} />
                          <Typography variant="subtitle1" fontWeight={600}>
                            Pendentes de Devolucao
                          </Typography>
                          <Chip
                            label={pendentes.length}
                            size="small"
                            sx={{
                              height: 22,
                              minWidth: 22,
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              backgroundColor: alpha(theme.palette.warning.main, 0.15),
                              color: theme.palette.warning.dark,
                            }}
                          />
                        </Box>
                        {isMobile
                          ? pendentes.map((m) => renderMobileCard(m, true))
                          : renderTable(pendentes, true)
                        }
                      </Box>
                    )}

                    {/* Devolvidos Section */}
                    {devolvidos.length > 0 && (
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                          <CheckCircle sx={{ fontSize: 20, color: theme.palette.success.main }} />
                          <Typography variant="subtitle1" fontWeight={600}>
                            Devolvidos
                          </Typography>
                          <Chip
                            label={devolvidos.length}
                            size="small"
                            sx={{
                              height: 22,
                              minWidth: 22,
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              backgroundColor: alpha(theme.palette.success.main, 0.15),
                              color: theme.palette.success.dark,
                            }}
                          />
                        </Box>
                        {isMobile
                          ? devolvidos.map((m) => renderMobileCard(m, false))
                          : renderTable(devolvidos, false)
                        }
                      </Box>
                    )}

                    {/* All empty */}
                    {pendentes.length === 0 && devolvidos.length === 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          py: 6,
                        }}
                      >
                        <SearchOff sx={{ fontSize: 48, color: "text.disabled", mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                          Nenhuma movimentacao encontrada
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5 }}>
                          {includeReparo
                            ? "Nao existem movimentacoes de reparo registradas."
                            : "Este militar nao possui cautelas registradas."}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Fade>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 8,
              }}
            >
              <Alert severity="warning" variant="outlined" sx={{ borderRadius: 3 }}>
                Sem permissao para acessar este recurso
              </Alert>
            </Box>
          )}

          {/* Confirm Dialog */}
          <Dialog
            open={confirmDialog.open}
            onClose={() => setConfirmDialog({ open: false, item: null })}
            PaperProps={{
              sx: { borderRadius: 3, maxWidth: 420 },
            }}
          >
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AssignmentReturn sx={{ color: theme.palette.primary.main }} />
                </Box>
                <Typography variant="h6" fontWeight={600}>
                  Confirmar Devolucao
                </Typography>
              </Box>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ pt: 2.5 }}>
              {confirmDialog.item && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Deseja confirmar a devolucao do seguinte material?
                  </Typography>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                      {confirmDialog.item.material_description}
                    </Typography>
                    <Stack direction="row" spacing={2}>
                      <Typography variant="caption" color="text.secondary">
                        Quantidade: {confirmDialog.item.quantity}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Data: {formatDate(confirmDialog.item.date)}
                      </Typography>
                    </Stack>
                  </Paper>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 1 }}>
              <Button
                onClick={() => setConfirmDialog({ open: false, item: null })}
                sx={{ color: "text.secondary" }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmDevolver}
                startIcon={<AssignmentReturn />}
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                }}
              >
                Confirmar Devolucao
              </Button>
            </DialogActions>
          </Dialog>

          {/* Snackbar */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={4000}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
              severity={snackbar.severity}
              variant="filled"
              sx={{ borderRadius: 2 }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </div>
      </MenuContext>
    </PrivateRoute>
  );
}
