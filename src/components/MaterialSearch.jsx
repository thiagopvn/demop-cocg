import { useState, useMemo } from "react";
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
    InputAdornment,
    CircularProgress,
    Box
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import { useTheme } from '@mui/material/styles';
import { useMaterials } from '../contexts/MaterialContext';
import { useDebounce } from '../hooks/useDebounce';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    padding: theme.spacing(1),
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
}));

const MaterialSearch = ({ onSelectMaterial, selectedItem }) => {
    const { materials, loading } = useMaterials();
    const [searchTerm, setSearchTerm] = useState("");
    const [anchorEls, setAnchorEls] = useState({});
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const filteredMaterials = useMemo(() => {
        if (!debouncedSearchTerm || debouncedSearchTerm.trim().length === 0) {
            return [];
        }

        const searchKeywords = debouncedSearchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
        
        return materials.filter(material => {
            const materialDescription = (material.description || '').toLowerCase();
            const materialCategoria = (material.categoria || '').toLowerCase();
            
            const searchableText = `${materialDescription} ${materialCategoria}`;
            
            return searchKeywords.every(keyword => searchableText.includes(keyword));
        });
    }, [debouncedSearchTerm, materials]);

    const handlePopoverOpen = (event, materialId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [materialId]: { anchorEl: event.currentTarget, open: true },
        }));
    };

    const handlePopoverClose = (materialId) => {
        setAnchorEls((prev) => ({
            ...prev,
            [materialId]: { anchorEl: null, open: false },
        }));
    };

    return (
        <div className="search">
            <TextField
                size="small"
                label="Pesquisar Material"
                variant="outlined"
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite o código, descrição ou categoria do material..."
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <SearchIcon />
                        </InputAdornment>
                    ),
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
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={isSmallScreen ? 2 : 3} align="center">
                                <CircularProgress size={24} />
                            </TableCell>
                        </TableRow>
                    ) : !debouncedSearchTerm || debouncedSearchTerm.trim().length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={isSmallScreen ? 2 : 3} align="center">
                                <Typography variant="body2" color="text.secondary">
                                    Digite para pesquisar um material.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : filteredMaterials.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={isSmallScreen ? 2 : 3} align="center">
                                <Typography variant="body2" color="text.secondary">
                                    Nenhum material encontrado.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredMaterials
                            .filter(material => !selectedItem || material.id === selectedItem.id)
                            .map((material) => (
                                <TableRow
                                    key={material.id}
                                    onClick={() => onSelectMaterial(material)}
                                    sx={{
                                        cursor: "pointer",
                                        backgroundColor: selectedItem?.id === material.id ? "#e3f2fd" : "inherit",
                                        "&:hover": { backgroundColor: "#f5f5f5" },
                                    }}
                                >
                                    <StyledTableCell sx={{ textAlign: "center", wordBreak: 'break-word' }}>
                                        {material.description}
                                    </StyledTableCell>
                                    <StyledTableCell sx={{ textAlign: "center" }}>
                                        {material.estoque_total || 0}/{material.estoque_atual || 0}
                                    </StyledTableCell>
                                    {!isSmallScreen && (
                                        <StyledTableCell sx={{ textAlign: "center" }}>
                                            <IconButton
                                                onMouseEnter={(e) => handlePopoverOpen(e, material.id)}
                                                onMouseLeave={() => handlePopoverClose(material.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                size="small"
                                            >
                                                <InfoIcon color="info" fontSize="small" />
                                            </IconButton>
                                            <Popover
                                                sx={{ pointerEvents: "none" }}
                                                open={anchorEls[material.id]?.open || false}
                                                anchorEl={anchorEls[material.id]?.anchorEl}
                                                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                                                transformOrigin={{ vertical: "top", horizontal: "left" }}
                                                onClose={() => handlePopoverClose(material.id)}
                                                disableRestoreFocus
                                            >
                                                <Box sx={{ p: 2 }}>
                                                    <Typography variant="body2" gutterBottom>
                                                        <strong>ID:</strong> {material.id}
                                                    </Typography>
                                                    <Typography variant="body2" gutterBottom>
                                                        <strong>Descrição:</strong> {material.description}
                                                    </Typography>
                                                    <Typography variant="body2" gutterBottom>
                                                        <strong>Categoria:</strong> {material.categoria || 'N/A'}
                                                    </Typography>
                                                    <Typography variant="body2" gutterBottom>
                                                        <strong>Estoque Disponível:</strong> {material.estoque_atual || 0}
                                                    </Typography>
                                                    <Typography variant="body2" gutterBottom>
                                                        <strong>Estoque Total:</strong> {material.estoque_total || 0}
                                                    </Typography>
                                                    {material.maintenance_status && (
                                                        <Typography variant="body2">
                                                            <strong>Status:</strong> {material.maintenance_status}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Popover>
                                        </StyledTableCell>
                                    )}
                                </TableRow>
                            ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default MaterialSearch;