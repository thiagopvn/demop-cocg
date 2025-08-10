import UserSearch from "../../components/UserSearch";
import MenuContext from "../../contexts/MenuContext";
import PrivateRoute from "../../contexts/PrivateRoute";
import { useState, useEffect } from "react";
import { verifyToken } from "../../firebase/token";
import { yellow } from "@mui/material/colors";
import { Paper, Typography, Table, TableHead, TableBody, TableRow, TableCell, Checkbox, FormControlLabel } from "@mui/material";
import db from "../../firebase/db";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import ButtonDevolver from "../../components/ButtonDevolver";

export default function Devolucoes() {
  const [userRole, setUserRole] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [includeReparo, setIncludeReparo] = useState(false); // Novo estado para o checkbox
  const [userCritery, setUserCritery] = useState(""); // Novo estado

  useEffect(() => {
    const fetchUserRole = async () => {
      const token = localStorage.getItem("token");
      const user = await verifyToken(token);
      setUserRole(user.role);
    };
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (!selectedUser && !includeReparo) return;

    const fetchMovimentacoes = async () => {
      let q;
      if (includeReparo) {
        q = query(
          collection(db, "movimentacoes"),
          where("type", "==", "reparo")
        );
      } else {
        q = query(
          collection(db, "movimentacoes"),
          where("user", "==", selectedUser.id)
        );
      }

      const querySnapshot = await getDocs(q);
      const movimentacoes = [];
      querySnapshot.forEach((doc) => {
        movimentacoes.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setMovimentacoes(movimentacoes);
    };

    fetchMovimentacoes();
  }, [selectedUser, includeReparo]);

  const handleDevolver = async (movimentacao) => {
    try {
      const docRef = doc(db, "movimentacoes", movimentacao.id);
      await updateDoc(docRef, {
        status: includeReparo ? "devolvidaDeReparo" : "devolvido",
      });

      const materialId = movimentacao.material;
      const docRefMaterial = doc(db, "materials", materialId);
      const materialSnap = await getDoc(docRefMaterial);

      if (materialSnap.exists()) {
        const materialData = materialSnap.data();
        const quantidadeDevolvida = movimentacao.quantity;
        const quantidadeAtual = materialData.estoque_atual || 0; // Garante que quantity seja um número
        console.log("Quantidade atual:", quantidadeAtual);
        // Adiciona a quantidade devolvida à quantidade atual
        const novaQuantidade = quantidadeAtual + quantidadeDevolvida;
        console.log("Nova quantidade:", novaQuantidade);

        // Atualiza o documento do material com a nova quantidade
        await updateDoc(docRefMaterial, {
          estoque_atual: novaQuantidade,
        });

        console.log("Material devolvido e quantidade atualizada com sucesso!");
      } else {
        console.log("Material não encontrado!");
      }
    } catch (error) {
      console.error("Erro ao devolver material:", error);
    }
  };

  return (
    <PrivateRoute>
      <MenuContext>
        <div className="root-protected">
          {userRole === "admin" || userRole === "editor" ? (
            <>
              <div className="search">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeReparo}
                      onChange={(e) => setIncludeReparo(e.target.checked)}
                    />
                  }
                  label="Mostrar Reparos"
                />
              </div>
              {!includeReparo && (
                <UserSearch 
                  onSelectUser={setSelectedUser}
                  userCritery={userCritery}
                  onSetUserCritery={setUserCritery}
                />
              )}
              {selectedUser || includeReparo ? (
                <div className="search">
                  <Paper style={{ padding: 10, margin: "20px 0" }}>
                    <Typography variant="caption" component="h6" align="center">
                      {selectedUser ? selectedUser.full_name : "Movimentações de Reparo"}
                    </Typography>

                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Data</TableCell>
                          <TableCell>Material</TableCell>
                          <TableCell>Quantidade</TableCell>
                          <TableCell>Devolver</TableCell>
                        </TableRow>
                      </TableHead>

                      <TableBody>
                        {movimentacoes.map((movimentacao) => (
                          <TableRow key={movimentacao.id}>
                            <TableCell>
                              {movimentacao.date.toDate().toLocaleDateString()}
                            </TableCell>
                            <TableCell>{movimentacao.material_description}</TableCell>
                            <TableCell>{movimentacao.quantity}</TableCell>
                            <TableCell>
                              <ButtonDevolver status={movimentacao.status} onDevolver={() => handleDevolver(movimentacao)} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ backgroundColor: yellow[500], textAlign: "center" }}>
              Sem permissão para acessar este recurso
            </div>
          )}
        </div>
      </MenuContext>
    </PrivateRoute>
  );
}