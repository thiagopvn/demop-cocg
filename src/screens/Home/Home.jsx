import { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  LocalShipping,
  Inventory,
  Person,
  Timeline,
} from "@mui/icons-material";
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  orderBy,
  limit,
  doc,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import db from "../../firebase/db";

import { verifyToken } from "../../firebase/token";
import CautelaStrip from "../../components/CautelaStrip";

export default function Home() {
  const [stats, setStats] = useState({
    totalMaterials: 0,
    totalViaturas: 0,
    totalUsers: 0,
    recentMovements: [],
    allMovements: [],
  });
  const [loading, setLoading] = useState(true);
  const [minhasCautelas, setMinhasCautelas] = useState([]);
  useEffect(() => {
    const getMinhasCautelas = async () => {
      const token = localStorage.getItem("token");
      const user = await verifyToken(token);
      const movimentacoes = await getDocs(
        query(collection(db, "movimentacoes"), where("user", "==", user.userId))
      );
      const movimentacoesList = movimentacoes.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMinhasCautelas(movimentacoesList);
    };

    getMinhasCautelas();

    const fetchData = async () => {
      try {
        const materialsSnap = await getDocs(collection(db, "materials"));
        const viaturasSnap = await getDocs(collection(db, "viaturas"));
        const usersSnap = await getDocs(collection(db, "users"));
        const recentMovementsSnap = await getDocs(
          query(
            collection(db, "movimentacoes"),
            orderBy("date", "desc"),
            limit(5)
          )
        );
        const allMovementsSnap = await getDocs(
          query(
            collection(db, "movimentacoes"),
            orderBy("date", "desc"),
            limit(50)
          )
        );

        setStats({
          totalMaterials: materialsSnap.size,
          totalViaturas: viaturasSnap.size,
          totalUsers: usersSnap.size,
          recentMovements: recentMovementsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
          allMovements: allMovementsSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
        });
        setLoading(false);
      } catch (error) {
        console.error("Erro:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );

  const handleSign = async (id) => {
    try {
      const docRef = doc(db, "movimentacoes", id); // Referência ao documento
      const docSnap = await getDoc(docRef); // Obtém o documento

      if (docSnap.exists()) {
        // Atualiza o campo "signed" para true
        await updateDoc(docRef, {
          signed: true,
        });
        console.log("Documento atualizado com sucesso!");
      } else {
        console.log("Documento não encontrado!");
      }
    } catch (error) {
      console.error("Erro ao obter/atualizar documento:", error);
    }
  };
  return (
    <PrivateRoute>
      <MenuContext>
        <div className="root-protected">
          <Box sx={{ p: 1 }}>
            <Typography variant="h6" sx={{ mb: 1, color: "#1976d2" }}>
              Painel de Controle
            </Typography>
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: "#e3f2fd" }}>
                  <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Inventory
                        sx={{ mr: 1, color: "#1976d2", fontSize: "1rem" }}
                      />
                      <Typography variant="body2">
                        Materiais: {stats.totalMaterials}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: "#e8f5e9" }}>
                  <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <LocalShipping
                        sx={{ mr: 1, color: "#2e7d32", fontSize: "1rem" }}
                      />
                      <Typography variant="body2">
                        Viaturas: {stats.totalViaturas}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: "#fff3e0" }}>
                  <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Person
                        sx={{ mr: 1, color: "#ed6c02", fontSize: "1rem" }}
                      />
                      <Typography variant="body2">
                        Usuários: {stats.totalUsers}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} md={3}>
                <Card sx={{ bgcolor: "#fce4ec" }}>
                  <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Timeline
                        sx={{ mr: 1, color: "#d81b60", fontSize: "1rem" }}
                      />
                      <Typography variant="body2">
                        Movimentações: {stats.allMovements.length}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Paper sx={{ p: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Últimas Movimentações
              </Typography>
              {stats.recentMovements.map((m) => (
                <Box
                  key={m.id}
                  sx={{
                    p: 0.5,
                    mb: 0.5,
                    bgcolor: "#f5f5f5",
                    borderRadius: 1,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="caption">
                    {m.type.charAt(0).toUpperCase() + m.type.slice(1)}
                  </Typography>

                  <Typography variant="caption">{m.sender_name}</Typography>
                  <Typography variant="caption">
                    {new Date(m.date.toDate()).toLocaleDateString()}{" "}
                    {new Date(m.date.toDate()).toLocaleTimeString()}
                  </Typography>
                </Box>
              ))}
            </Paper>

            <Paper sx={{ p: 1, height: 200 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Movimentações por Tipo
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      name: "Aquisição",
                      qtd: stats.allMovements.filter(
                        (m) => m.type === "aquisicao"
                      ).length,
                    },
                    {
                      name: "Cautela",
                      qtd: stats.allMovements.filter((m) => m.type === "cautela")
                        .length,
                    },
                    {
                      name: "Descarte",
                      qtd: stats.allMovements.filter((m) => m.type === "descarte")
                        .length,
                    },
                    {
                      name: "Reparo",
                      qtd: stats.allMovements.filter((m) => m.type === "reparo")
                        .length,
                    },
                  ]}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="qtd" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Box>
          {minhasCautelas.length !== 0 && (
            <Paper sx={{ p: 1, mb: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Suas Movimentacoes
              </Typography>
              {minhasCautelas.map((cautela) => (
                <CautelaStrip
                  key={cautela.id}
                  cautela={cautela}
                  onSign={handleSign}
                />
              ))}
            </Paper>
          )}
        </div>
         </MenuContext>
    </PrivateRoute>
  );
}
