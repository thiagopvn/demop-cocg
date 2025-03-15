

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    Button,
    TextField,
    IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function CategoriaDialog({ onSubmit, onCancel, open, editData = null }) {
    const [data, setData] = React.useState({
        id: editData?.id || "",
        description: editData?.description || "",
        created_at: editData?.created_at || new Date(),
    });

    return (
        <Dialog open={open}>
            <DialogTitle>{editData ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
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
                    autoFocus
                    margin="dense"
                    id="description"
                    label="Descrição da Categoria"
                    type="text"
                    fullWidth
                    value={data.description}
                    onChange={(e) => setData({ ...data, description: e.target.value })}
                />
                <Button
                    onClick={() => onSubmit(data)}
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ mt: 3 }}
                >
                    Salvar
                </Button>
            </DialogContent>
        </Dialog>
    );
}
