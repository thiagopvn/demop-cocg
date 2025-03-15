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
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import db from "../../firebase/db";
import { query, collection, where, getDocs } from "firebase/firestore";
import {exportarMovimentacoes } from "../../firebase/xlsx";
import excelIcon from "../../assets/excel.svg";
export default function MaterialUsuario() {
  const [materialCritery, setMaterialCritery] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [filteredMovimentacoes, setFilteredMovimentacoes] = useState([]);
  const [filtro, setFiltro] = useState(0);
  /*

    filtro tem 4 valores possiveis:
     0 = todas as movimentacoes com type cautelado
     1 = todas as movimentacoes com type cautelado e status != devolvido
     2 = todas as movimentacoes com type cautelado e status == devolvido
     3 = todas as movimentacoes com type descartado
    
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
        where("material", "==", selectedMaterial.id)
      );
      console.log(selectedMaterial.id)
      const querySnapshot = await getDocs(q);
      
      const movimentacoes = [];
      querySnapshot.forEach((doc) => {

        movimentacoes.push(doc.data());
      });
  
      setMovimentacoes(movimentacoes);
    };

    if (selectedMaterial) {
      fetchMovimentacoes();
    }
  }, [selectedMaterial]);
  useEffect(() => {
    if (movimentacoes.length > 0) {
        switch(filtro) {
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
          {selectedMaterial && (
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
        <MaterialSearch
          materialCritery={materialCritery}
          onSetMaterialCritery={setMaterialCritery}
          selectedItem={selectedMaterial}
          onSelectMaterial={handleSelectMaterial}
        />
        {selectedMaterial && (
          <Box>
            <RadioGroup
              sx={{
                display: "flex",
                gap: 2,
                flexDirection: "row",
                justifyContent: "center",
              }}
              value={filtro}
              onChange={(e) => setFiltro(Number(e.target.value))} // Convertendo para número
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
              <FormControlLabel
                value={3}
                control={<Radio />}
                label="Saida"
              />
            </RadioGroup>
          </Box>
        )}
        {/*<div>{JSON.stringify(filteredMovimentacoes)}</div>*/}
        <Table size="small" sx={{ marginTop: 2, width: '100%', tableLayout: 'fixed' }}>
            <TableHead>
                <TableRow>
                    <TableCell sx={{ textAlign: "left", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                        Militar
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
                {
                    filteredMovimentacoes.map((mov) => (
                        <TableRow key={mov.id}>
                            <TableCell sx={{ textAlign: "left" }}>
                                {mov.user_name}
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
                    ))
                }

            </TableBody>
        </Table>


      </Paper>

      {selectedMaterial && filteredMovimentacoes.length > 0 && (
        <Tooltip title="Exportar para Excel" placement="left">
          <Fab
            
            size="small"
            onClick={() => exportarMovimentacoes(
              filteredMovimentacoes,
              `movimentacoes_${selectedMaterial.description}`
            )}
            sx={{
              position: 'fixed',
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
/*
[{"material":"FSOG6yITzgN6ywCffJ9C","status":"devolvido","user":"x4V1bIy9joDZRRxgE7Zc","signed":true,"quantity":2,"type":"cautela","user_name":"Pablo","date":{"seconds":1741275738,"nanoseconds":262000000},"material_description":"Abafador","sender":"USfBN9ZrYXrHRdRcHw9g","sender_name":"user1"}]
Militar
*/