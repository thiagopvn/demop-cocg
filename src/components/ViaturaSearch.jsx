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
    styled,
    useMediaQuery,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import db from "../firebase/db";
import { useTheme } from '@mui/material/styles';

// Estilo para as células da tabela
const StyledTableCell = styled(TableCell)(({ theme }) => ({
    padding: theme.spacing(1),
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
}));

const ViaturaSearch = ({ viaturaCritery, onSetViaturaCritery, onSelectViatura, selectedItem }) => {
    const [viaturasEncontradas, setViaturasEncontradas] = useState([]);
    const [anchorEls, setAnchorEls] = useState({});
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    // Função para buscar viaturas no Firestore
    const filtrarViaturas = async (criterio) => {
        const viaturaCollection = collection(db, "viaturas");
        let q;

        if (criterio) {
            const critery_lower = criterio.toLowerCase();
            const start = critery_lower;
            const end = critery_lower + "\uf8ff";
            q = query(
                viaturaCollection,
                where("description_lower", ">=", start),
                where("description_lower", "<=", end),
                orderBy("description_lower")
            );
        } else {
          
            q = query(viaturaCollection, orderBy("description_lower"));
        }

        const querySnapshot = await getDocs(q);
        const viaturas = [];

        querySnapshot.forEach((doc) => {
            viaturas.push({
                id: doc.id,
                ...doc.data(),
            });
        });

        setViaturasEncontradas(viaturas);
    };

    // Carrega as viaturas ao montar o componente


    // Função para lidar com a tecla Enter
    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            filtrarViaturas(viaturaCritery);
        }
    };

    // Funções para abrir/fechar o popover de informações
    const handlePopoverOpen = (event, viaturaId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [viaturaId]: {
                anchorEl: event.currentTarget,
                open: true,
            },
        }));
    };

    const handlePopoverClose = (viaturaId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [viaturaId]: {
                anchorEl: null,
                open: false,
            },
        }));
    };

    return (
        <div className="search">
            {/* Campo de pesquisa */}
            <TextField
                size="small"
                label="Pesquisar Viatura"
                variant="outlined"
                fullWidth
                value={viaturaCritery || ""}
                onChange={(e) => onSetViaturaCritery(e.target.value)}
                onKeyDown={handleKeyDown}
                slotProps={{
                    input: {
                        endAdornment: (
                            <IconButton
                                position="end"
                                onClick={() => filtrarViaturas(viaturaCritery)}
                            >
                                <SearchIcon />
                            </IconButton>
                        ),
                    },
                }}
            />

            {/* Tabela de resultados */}
            <Table size="small" sx={{ marginTop: 2, width: '100%', tableLayout: 'fixed' }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ textAlign: "center", backgroundColor: "#ddeeee", fontWeight: "bold" }}>
                            Descrição
                        </TableCell>
                        {!isSmallScreen && (
                            <TableCell sx={{ textAlign: "center", backgroundColor: "#ddeeee", fontWeight: "bold", width: "80px" }}>
                                Info
                            </TableCell>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {viaturasEncontradas
                        .filter(viatura => !selectedItem || viatura.id === selectedItem.id)
                        .map((viatura) => (
                            <TableRow
                                key={viatura.id}
                                onClick={() => onSelectViatura(viatura)}
                                sx={{
                                    cursor: "pointer",
                                    backgroundColor: selectedItem?.id === viatura.id ? "#e3f2fd" : "inherit",
                                    "&:hover": {
                                        backgroundColor: "#f5f5f5",
                                    },
                                }}
                            >
                                <StyledTableCell sx={{ textAlign: "center" }}>
                                    {viatura.description}
                                </StyledTableCell>
                                {!isSmallScreen && (
                                    <StyledTableCell sx={{ textAlign: "center" }}>
                                        <IconButton
                                            aria-owns={anchorEls[viatura.id]?.open ? "viatura-mouse-over-popover" : undefined}
                                            aria-haspopup="true"
                                            onMouseEnter={(e) => handlePopoverOpen(e, viatura.id)}
                                            onMouseLeave={() => handlePopoverClose(viatura.id)}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <InfoIcon color="info" />
                                        </IconButton>
                                        <Popover
                                            id="viatura-mouse-over-popover"
                                            sx={{ pointerEvents: "none" }}
                                            open={anchorEls[viatura.id]?.open || false}
                                            anchorEl={anchorEls[viatura.id]?.anchorEl}
                                            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                            transformOrigin={{ vertical: "top", horizontal: "left" }}
                                            onClose={() => handlePopoverClose(viatura.id)}
                                            disableRestoreFocus
                                        >
                                            <Typography component={"div"} sx={{ p: 1 }}>
                                                <div>ID: {viatura.id}</div>
                                                <div>Descrição: {viatura.description}</div>
                                                {viatura.created_at && (
                                                    <div>Criado em: {new Date(viatura.created_at.toDate()).toLocaleString()}</div>
                                                )}
                                                {viatura.ultima_movimentacao && (
                                                    <div>Última Movimentação: {new Date(viatura.ultima_movimentacao.toDate()).toLocaleString()}</div>
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

export default ViaturaSearch;