import React, { useContext, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Button,
    TextField,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { CategoriaContext } from "../contexts/CategoriaContext";

export default function MaterialDialog({ onSubmit, onCancel, open, editData = null }) {
    const { categorias } = useContext(CategoriaContext);
    const [data, setData] = React.useState({
        id: editData?.id || "",
        description: editData?.description || "",
        estoque_atual: editData?.estoque_atual || 0,
        estoque_total: editData?.estoque_total || 0,
        categoria: editData?.categoria || "",
        categoria_id: editData?.categoria_id || "",
    });
  const handleChangeCategoria = (event) => {
        const selectedCategoriaId = event.target.value;
        const selectedCategoria = categorias.find(
            (categoria) => categoria.id === selectedCategoriaId
        );

        setData({
            ...data,
            categoria_id: selectedCategoriaId,
            categoria: selectedCategoria ? selectedCategoria.description : "",
        });
    };

    return (
        <Dialog open={open}>
            <DialogTitle>{editData?"Editar Material":"Novo Material"}</DialogTitle>
            <IconButton
                aria-label="close"
                sx={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    color: (theme) => theme.palette.grey[500],
                }}
                onClick={onCancel}
            >
                <CloseIcon />
            </IconButton>

            <DialogContent>
                <TextField
                    fullWidth
                    label="Descrição"
                    margin="normal"
                    value={data.description}
                    onChange={(e) => setData({ ...data, description: e.target.value })}
                />
                <TextField
                    fullWidth
                    label="Estoque Atual"
                    margin="normal"
                    type='number'
                    value={data.estoque_atual}
                    onChange={(e) => setData({ ...data, estoque_atual: e.target.value })}
                />
                <TextField
                    fullWidth
                    label="Estoque Total"
                    type="number"
                    margin="normal"
                    value={data.estoque_total}
                    onChange={(e) => setData({ ...data, estoque_total: e.target.value })}
                />
                <FormControl fullWidth margin="normal">
                    <InputLabel id="categoria-select-label">Categoria</InputLabel>
                    <Select
                        labelId="categoria-select-label"
                        id="categoria-select"
                        value={data.categoria_id}
                        label="Categoria"
                        onChange={handleChangeCategoria}
                    >
                        {categorias.map((categoria) => (
                            <MenuItem key={categoria.id} value={categoria.id}>
                                {categoria.description}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => onSubmit(data)}
                    fullWidth
                    sx={{ marginTop: 5 }}
                >
                    Salvar
                </Button>
            </DialogContent>
        </Dialog>
    );
}