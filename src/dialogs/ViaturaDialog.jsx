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



export default function ViaturaDialog({ onSubmit, onCancel, open, editData = null }) {
    const [data, setData] = React.useState({
        id: editData?.id || "",
        description: editData?.description || "",
        created_at: editData?.created_at || 0,
        ultima_movimentacao: editData?.ultima_movimentacao || 0,
    });

    return (
        <Dialog open={open}>
            <DialogTitle>{editData?"Editar Viatura":"Nova Viatura"}</DialogTitle>
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
