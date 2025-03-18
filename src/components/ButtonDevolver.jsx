import { useState } from "react";
import { IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { AssignmentReturn } from "@mui/icons-material";

export default function ButtonDevolver({ status, onDevolver }) {
    const [devolvido, setDevolvido] = useState(status === "devolvidaDeReparo"||status === "devolvido");
    const [open, setOpen] = useState(false);

    const handleDevolver = () => {
        setDevolvido(true);
        onDevolver();
    };

    const handleOpenDialog = () => {
        setOpen(true);
    };

    const handleCloseDialog = () => {
        setOpen(false);
    };

    const handleConfirmDevolver = () => {
        handleDevolver();
        handleCloseDialog();
    };

    return (
        <>
            
            <Tooltip title="Devolver Material">
                <IconButton
                    variant="contained"
                    color="primary"
                    disabled={devolvido}
                    onClick={handleOpenDialog}
                >
                    <AssignmentReturn />
                </IconButton>
            </Tooltip>

            <Dialog
                open={open}
                onClose={handleCloseDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">{"Confirmar Devolução?"}</DialogTitle>
                <DialogContent>
                    Tem certeza que deseja devolver este material?
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="primary">
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirmDevolver} color="primary" autoFocus>
                        Confirmar
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}