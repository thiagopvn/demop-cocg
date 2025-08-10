import { useEffect, useState } from "react";
import {
    TextField,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    IconButton,
    Typography,
    Popover,
    styled, // Importe styled do MUI
    useMediaQuery, // Importe useMediaQuery do MUI
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import db from "../firebase/db";
import { useTheme } from '@mui/material/styles';

// Crie um styled TableCell para reduzir o preenchimento
const StyledTableCell = styled(TableCell)(({ theme }) => ({
    padding: theme.spacing(1), // Reduz o preenchimento para 8px
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
}));

const MaterialSearch = ({ materialCritery, onSetMaterialCritery, onSelectMaterial, selectedItem }) => {
    const [materiaisEncontrados, setMateriaisEncontrados] = useState([]);
    const [anchorEls, setAnchorEls] = useState({});
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const filtrarMateriais = async (criterio) => {
        const materialCollection = collection(db, "materials");
        let q;

        if (criterio) {
            const critery_lower = criterio.toLowerCase();
            const start = critery_lower;
            const end = critery_lower + "\uf8ff";
            
            q = query(
                materialCollection,
                where("description_lower", ">=", start),
                where("description_lower", "<=", end),
                orderBy("description_lower")
            );
        } else {
            // Busca TODOS os materiais quando o critério é vazio
            q = query(
                materialCollection,
                orderBy("description_lower")
            );
        }

        const querySnapshot = await getDocs(q);
        const materiais = [];

        querySnapshot.forEach((doc) => {
            materiais.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        setMateriaisEncontrados(materiais);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            filtrarMateriais(materialCritery);
        }
    };

    const handlePopoverOpen = (event, materialId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [materialId]: {
                anchorEl: event.currentTarget,
                open: true,
            },
        }));
    };

    const handlePopoverClose = (materialId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [materialId]: {
                anchorEl: null,
                open: false,
            },
        }));
    };

    return (
        <div className="search">
            <TextField
                size="small"
                label="Pesquisar Material"
                variant="outlined"
                fullWidth
                value={materialCritery || ""}
                onChange={(e) => onSetMaterialCritery(e.target.value)}
                onKeyDown={handleKeyDown}
                slotProps={{
                    input: {
                        endAdornment: (
                            <IconButton
                                position="end"
                                onClick={() => filtrarMateriais(materialCritery)}
                            >
                                <SearchIcon />
                            </IconButton>
                        ),
                    },
                }}
            />

            <Table size="small" sx={{ marginTop: 2, width: '100%', tableLayout: 'fixed' }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ textAlign: "center", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                            Descrição
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                            Estoque/Disp.
                        </TableCell>
                        {!isSmallScreen && (
                            <TableCell sx={{ textAlign: "center", backgroundColor: "#ddeeee", fontWeight: "bold", width: "80px" }}>
                                Info
                            </TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {materiaisEncontrados
                        .filter(material => !selectedItem || material.id === selectedItem.id)
                        .map((material) => (
                            <TableRow
                                key={material.id}
                                onClick={() => onSelectMaterial(material)}
                                sx={{
                                    cursor: "pointer",
                                    backgroundColor: selectedItem?.id === material.id ? "#e3f2fd" : "inherit",
                                    "&:hover": {
                                        backgroundColor: "#f5f5f5",
                                    },
                                }}
                            >
                                <StyledTableCell sx={{ textAlign: "center", wordBreak: 'break-word' }}>
                                    {material.description}
                                </StyledTableCell>
                                <StyledTableCell sx={{ textAlign: "center" }}>
                                    {material.estoque_total}/{material.estoque_atual}
                                </StyledTableCell>
                                {!isSmallScreen && (
                                    <StyledTableCell sx={{ textAlign: "center" }}>
                                        <IconButton
                                            aria-owns={anchorEls[material.id]?.open ? "material-mouse-over-popover" : undefined}
                                            aria-haspopup="true"
                                            onMouseEnter={(e) => handlePopoverOpen(e, material.id)}
                                            onMouseLeave={() => handlePopoverClose(material.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <InfoIcon color="info" />
                                        </IconButton>
                                        <Popover
                                            id="material-mouse-over-popover"
                                            sx={{ pointerEvents: "none" }}
                                            open={anchorEls[material.id]?.open || false}
                                            anchorEl={anchorEls[material.id]?.anchorEl}
                                            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                            transformOrigin={{ vertical: "top", horizontal: "left" }}
                                            onClose={() => handlePopoverClose(material.id)}
                                            disableRestoreFocus
                                        >
                                            <Typography component={"div"} sx={{ p: 1 }}>
                                                <div>ID: {material.id}</div>
                                                <div>Descrição: {material.description}</div>
                                                <div>Estoque Disponível: {material.estoque_atual}</div>
                                                <div>Estoque Total: {material.estoque_total}</div>
                                                <div>Categoria: {material.categoria}</div>
                                                {material.ultima_movimentacao && (
                                                    <div>Última Movimentação: {new Date(material.ultima_movimentacao.toDate()).toLocaleString()}</div>
                                                )}
                                                {material.created_at && (
                                                    <div>Criado em: {new Date(material.created_at.toDate()).toLocaleString()}</div>
                                                )}
                                            </Typography>
                                        </Popover>
                                    </StyledTableCell>
                                )}
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default MaterialSearch;