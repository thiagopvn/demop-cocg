import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  TextField,
  Button,
} from "@mui/material";
import signature from "../assets/signature.png";
import { DoneAll } from "@mui/icons-material";

export default function CautelaStrip({ cautela, onSign }) {
  const [signed, setSigned] = useState(cautela.signed);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [accept, setAccept] = useState("");
  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(
      timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000
    );
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <Box
      key={cautela.id}
      sx={{
        p: 0.5,
        mb: 0.5,
        bgcolor: "#f5f5f5",
        borderRadius: 1,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 10px",
      }}
    >
      <Typography variant="caption">
        {cautela.date ? formatDate(cautela.date) : "DND"}
      </Typography>
      <Typography variant="caption">
        <span>{cautela.quantity ? cautela.quantity : "NaN"}</span>
        <span>x </span>
        <span>
          {cautela.material_description ? cautela.material_description : "MND"}
        </span>
      </Typography>
      <div>
        {signed ? (
          <DoneAll color="success" />
        ) : (
          <Tooltip title="Assinatura">
            <IconButton
              size="small"
              onClick={() => {
                setDialogOpen(true);
              }}
            >
              <img
                src={signature}
                alt="Assinatura"
                style={{ width: 15, height: 15 }}
              />
            </IconButton>
          </Tooltip>
        )}
      </div>
      <Dialog open={dialogOpen}>
        <DialogTitle>Atenção</DialogTitle>

        <DialogContent>
          <Typography sx={{ marginBottom: "20px" }} variant="body2">
            Deseja assinar a cautela? Caso sim, digite "Aceito" no campo texto
            abaixo
          </Typography>
          <TextField
            color={accept === "Aceito" ? "primary" : "error"}
            margin="dense"
            id="name"
            label='Digite "Aceito"'
            type="text"
            fullWidth
            value={accept}
            onChange={(e) => setAccept(e.target.value)}
            autoComplete="off"
          />
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={() => setSnackbarOpen(false)}
            message="Você precisa digitar 'Aceito' para confirmar a assinatura"
            />
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="error"
            onClick={() => setDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              if (accept === "Aceito") {
                onSign(cautela.id);
                setSigned(true);
                setDialogOpen(false);
              } else {
                setSnackbarOpen(true);
              }
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
