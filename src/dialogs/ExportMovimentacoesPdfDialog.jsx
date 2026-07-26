import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Checkbox,
  FormControlLabel,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  alpha,
  useTheme,
} from "@mui/material";
import {
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  FilterList as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import db from "../firebase/db";

// Tipos de movimentacao disponiveis para o relatorio.
// rgb usado tanto na UI (chip) quanto no cabecalho da secao do PDF.
const TIPOS = [
  { value: "entrada", label: "Entradas", rgb: [22, 163, 74] },
  { value: "saída", label: "Saídas", rgb: [234, 88, 12] },
  { value: "cautela", label: "Cautelas", rgb: [37, 99, 235] },
  { value: "reparo", label: "Reparos / Inoperância", rgb: [217, 119, 6] },
  { value: "troca", label: "Trocas", rgb: [147, 51, 234] },
  { value: "alocado", label: "Alocações em Viatura", rgb: [8, 145, 178] },
];

const NAVY = [30, 58, 95];
const ORANGE = [255, 107, 53];

const formatDate = (date) => {
  if (!date) return "-";
  const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR");
};

const toBrDate = (isoStr) => {
  if (!isoStr) return "";
  const [y, m, d] = isoStr.split("-");
  return `${d}/${m}/${y}`;
};

// Primeiro dia do mes atual / hoje, em formato yyyy-mm-dd para input type=date
const firstDayOfMonthISO = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
};
const todayISO = () => new Date().toISOString().slice(0, 10);

// Mesmo criterio de busca aplicado na tela (Cautelados.jsx): material, militar e quem realizou.
const matchesSearch = (mov, search) =>
  (mov.material_description?.toLowerCase() || "").includes(search) ||
  (mov.user_name?.toLowerCase() || "").includes(search) ||
  (mov.sender_name?.toLowerCase() || "").includes(search);

// Slug simples para compor o nome do arquivo a partir do termo buscado.
const slugify = (txt) =>
  txt
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

export default function ExportMovimentacoesPdfDialog({ open, onClose, searchTerm = "" }) {
  const theme = useTheme();
  const [dataInicial, setDataInicial] = useState(firstDayOfMonthISO());
  const [dataFinal, setDataFinal] = useState(todayISO());
  const [selectedTypes, setSelectedTypes] = useState(() =>
    TIPOS.reduce((acc, t) => ({ ...acc, [t.value]: true }), {})
  );
  const [aplicarBusca, setAplicarBusca] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const buscaAtiva = searchTerm.trim();

  // Ao reabrir o dialog, volta a respeitar a busca da tela por padrao.
  useEffect(() => {
    if (open) {
      setAplicarBusca(true);
      setError("");
    }
  }, [open]);

  const filtrarPorBusca = aplicarBusca && !!buscaAtiva;

  const selecionados = useMemo(
    () => TIPOS.filter((t) => selectedTypes[t.value]),
    [selectedTypes]
  );

  const toggleType = (value) =>
    setSelectedTypes((prev) => ({ ...prev, [value]: !prev[value] }));

  const toggleTodos = () => {
    const allOn = selecionados.length === TIPOS.length;
    setSelectedTypes(TIPOS.reduce((acc, t) => ({ ...acc, [t.value]: !allOn }), {}));
  };

  const handleClose = () => {
    if (generating) return;
    setError("");
    onClose();
  };

  const gerarPdf = async () => {
    setError("");

    if (!dataInicial || !dataFinal) {
      setError("Selecione a data inicial e a data final.");
      return;
    }
    if (dataInicial > dataFinal) {
      setError("A data inicial não pode ser maior que a data final.");
      return;
    }
    if (selecionados.length === 0) {
      setError("Selecione ao menos um tipo de movimentação.");
      return;
    }

    setGenerating(true);
    try {
      const inicio = new Date(`${dataInicial}T00:00:00`);
      const fim = new Date(`${dataFinal}T23:59:59`);

      const q = query(
        collection(db, "movimentacoes"),
        where("date", ">=", Timestamp.fromDate(inicio)),
        where("date", "<=", Timestamp.fromDate(fim)),
        orderBy("date", "asc")
      );
      const snapshot = await getDocs(q);

      const tiposAtivos = new Set(selecionados.map((t) => t.value));
      const termo = filtrarPorBusca ? buscaAtiva.toLowerCase() : null;
      const porTipo = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!tiposAtivos.has(data.type)) return;
        if (termo && !matchesSearch(data, termo)) return;
        (porTipo[data.type] ||= []).push(data);
      });

      const totalRegistros = Object.values(porTipo).reduce((s, arr) => s + arr.length, 0);
      if (totalRegistros === 0) {
        setError(
          termo
            ? `Nenhuma movimentação encontrada para "${buscaAtiva}" no período e tipos selecionados.`
            : "Nenhuma movimentação encontrada para o período e tipos selecionados."
        );
        setGenerating(false);
        return;
      }

      construirPdf(porTipo);
      onClose();
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      setError("Erro ao gerar o PDF: " + (e?.message || "tente novamente."));
    } finally {
      setGenerating(false);
    }
  };

  const construirPdf = (porTipo) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 12;

    // ---- Cabecalho principal ----
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 26, "F");
    doc.setFillColor(...ORANGE);
    doc.rect(0, 26, pageWidth, 1.5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RELATÓRIO DE MOVIMENTAÇÕES", marginX, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("Controle de Cautela — DEMOP / COCG", marginX, 20);

    doc.setFontSize(9);
    const periodoTxt = `Período: ${toBrDate(dataInicial)} a ${toBrDate(dataFinal)}`;
    const geradoTxt = `Emitido em ${new Date().toLocaleString("pt-BR")}`;
    doc.text(periodoTxt, pageWidth - marginX, 13, { align: "right" });
    doc.text(geradoTxt, pageWidth - marginX, 20, { align: "right" });

    let cursorY = 34;

    // Faixa indicando que o relatorio esta restrito ao termo buscado na tela
    if (filtrarPorBusca) {
      doc.setFillColor(255, 243, 235);
      doc.setDrawColor(...ORANGE);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 8, 1.5, 1.5, "FD");
      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`Filtro de busca: "${buscaAtiva}"`, marginX + 3, cursorY + 5.4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        "Somente registros correspondentes ao material, militar ou responsável buscado.",
        pageWidth - marginX - 3,
        cursorY + 5.4,
        { align: "right" }
      );
      cursorY += 8 + 4;
    }

    // ---- Uma secao por tipo, na ordem definida em TIPOS ----
    TIPOS.forEach((tipo) => {
      const registros = porTipo[tipo.value];
      if (!registros || registros.length === 0) return;

      // Titulo da secao
      const tituloH = 8;
      if (cursorY + tituloH + 20 > doc.internal.pageSize.getHeight() - 12) {
        doc.addPage();
        cursorY = 16;
      }
      doc.setFillColor(...tipo.rgb);
      doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, tituloH, 1.5, 1.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(tipo.label.toUpperCase(), marginX + 3, cursorY + 5.4);
      doc.text(`${registros.length} registro(s)`, pageWidth - marginX - 3, cursorY + 5.4, {
        align: "right",
      });
      cursorY += tituloH + 1.5;

      const body = registros.map((r) => [
        formatDate(r.date),
        r.material_description || "-",
        r.quantity != null ? String(r.quantity) : "-",
        r.user_name || r.viatura_description || "-",
        r.status || "-",
        r.observacoes || "-",
        r.sender_name || "-",
      ]);

      autoTable(doc, {
        startY: cursorY,
        head: [["Data", "Material", "Qtd", "Responsável / Viatura", "Status", "Observação", "Registrado por"]],
        body,
        margin: { left: marginX, right: marginX },
        styles: {
          fontSize: 8,
          cellPadding: 1.8,
          overflow: "linebreak",
          valign: "middle",
          lineColor: [225, 228, 232],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: tipo.rgb,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
        },
        alternateRowStyles: { fillColor: [246, 248, 250] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 55 },
          2: { cellWidth: 14, halign: "center" },
          3: { cellWidth: 48 },
          4: { cellWidth: 26 },
          5: { cellWidth: "auto" },
          6: { cellWidth: 34 },
        },
        didDrawPage: () => {},
      });

      cursorY = doc.lastAutoTable.finalY + 8;
    });

    // ---- Rodape com numeracao ----
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const h = doc.internal.pageSize.getHeight();
      doc.setDrawColor(...ORANGE);
      doc.setLineWidth(0.4);
      doc.line(marginX, h - 9, pageWidth - marginX, h - 9);
      doc.setTextColor(120, 120, 120);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("Controle de Cautela — DEMOP / COCG", marginX, h - 5);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX, h - 5, { align: "right" });
    }

    const sufixoBusca = filtrarPorBusca ? `_${slugify(buscaAtiva)}` : "";
    const nomeArquivo = `movimentacoes${sufixoBusca}_${dataInicial}_a_${dataFinal}.pdf`;
    doc.save(nomeArquivo);
  };

  const todosSelecionados = selecionados.length === TIPOS.length;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      {/* Cabecalho */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
          px: 3,
          py: 2.5,
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PdfIcon sx={{ fontSize: 26 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            Exportar Relatório em PDF
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)" }}>
            Escolha o período e os tipos de movimentação
          </Typography>
        </Box>
        <IconButton onClick={handleClose} disabled={generating} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Busca ativa na tela — o relatorio respeita o termo por padrao */}
        {buscaAtiva && (
          <Box
            sx={{
              mb: 2.5,
              p: 1.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: aplicarBusca ? theme.palette.warning.main : "divider",
              backgroundColor: aplicarBusca
                ? alpha(theme.palette.warning.main, 0.1)
                : "transparent",
              transition: "all 0.15s ease",
            }}
          >
            <FormControlLabel
              sx={{ m: 0, width: "100%", alignItems: "flex-start" }}
              control={
                <Checkbox
                  checked={aplicarBusca}
                  onChange={() => setAplicarBusca((prev) => !prev)}
                  color="warning"
                  sx={{ pt: 0 }}
                />
              }
              label={
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <SearchIcon fontSize="small" color="warning" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Exportar apenas os resultados de “{buscaAtiva}”
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {aplicarBusca
                      ? "O PDF trará somente as movimentações exibidas na tela para esta busca."
                      : "Desmarcado: o PDF trará todas as movimentações do período selecionado."}
                  </Typography>
                </Box>
              }
            />
          </Box>
        )}

        {/* Periodo */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <CalendarIcon fontSize="small" color="error" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Período
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Data inicial"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Data final"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 2.5 }} />

        {/* Tipos */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FilterIcon fontSize="small" color="error" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Movimentações no relatório
            </Typography>
          </Box>
          <Button size="small" onClick={toggleTodos} sx={{ textTransform: "none" }}>
            {todosSelecionados ? "Limpar" : "Selecionar todos"}
          </Button>
        </Box>

        <Grid container spacing={1}>
          {TIPOS.map((tipo) => {
            const checked = !!selectedTypes[tipo.value];
            const cor = `rgb(${tipo.rgb.join(",")})`;
            return (
              <Grid item xs={12} sm={6} key={tipo.value}>
                <FormControlLabel
                  onClick={() => toggleType(tipo.value)}
                  sx={{
                    m: 0,
                    width: "100%",
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: checked ? cor : "divider",
                    backgroundColor: checked ? alpha(cor, 0.08) : "transparent",
                    px: 1,
                    py: 0.5,
                    transition: "all 0.15s ease",
                  }}
                  control={
                    <Checkbox
                      checked={checked}
                      sx={{ color: cor, "&.Mui-checked": { color: cor } }}
                    />
                  }
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: cor }} />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {tipo.label}
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            );
          })}
        </Grid>

        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            icon={<CheckCircleIcon />}
            label={`${selecionados.length} de ${TIPOS.length} tipos selecionados`}
            size="small"
            color={selecionados.length ? "error" : "default"}
            variant="outlined"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
        <Button onClick={handleClose} color="inherit" variant="outlined" disabled={generating} sx={{ borderRadius: 2 }}>
          Cancelar
        </Button>
        <Button
          onClick={gerarPdf}
          variant="contained"
          color="error"
          disabled={generating}
          startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <PdfIcon />}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {generating ? "Gerando..." : "Gerar PDF"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
