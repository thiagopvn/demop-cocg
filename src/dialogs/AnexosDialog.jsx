import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  LinearProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Tooltip,
  alpha,
  styled,
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  uploadAttachment,
  deleteAttachment,
  validateFile,
  formatFileSize,
  MAX_FILES,
} from '../services/attachmentService';

const DropZone = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isDragOver',
})(({ theme, isDragOver }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 12,
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
  },
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  backgroundColor: isDragOver
    ? alpha(theme.palette.primary.main, 0.08)
    : alpha(theme.palette.grey[100], 0.5),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}));

const AttachmentCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

export default function AnexosDialog({ open, onClose, movimentacao, userRole, username }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const fileInputRef = useRef(null);
  const [anexos, setAnexos] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const isAdmin = userRole === 'admin' || userRole === 'admingeral';
  const canUpload = isAdmin && anexos.length < MAX_FILES;

  useEffect(() => {
    if (open && movimentacao) {
      setAnexos(movimentacao.anexos || []);
      setError(null);
      setUploadProgress(0);
      setUploading(false);
    }
  }, [open, movimentacao]);

  const handleFiles = useCallback(async (files) => {
    if (!files.length || !movimentacao) return;
    setError(null);

    const fileList = Array.from(files);
    const remaining = MAX_FILES - anexos.length;
    if (fileList.length > remaining) {
      setError(`Limite de ${MAX_FILES} anexos. Você pode adicionar mais ${remaining}.`);
      return;
    }

    for (const file of fileList) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(`${file.name}: ${validation.error}`);
        return;
      }
    }

    setUploading(true);
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const { uploadTask, promise } = uploadAttachment(movimentacao.id, file, username);

        uploadTask.on('state_changed', (snapshot) => {
          const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          const totalProgress = ((i + fileProgress / 100) / fileList.length) * 100;
          setUploadProgress(totalProgress);
        });

        const anexo = await promise;
        setAnexos((prev) => [...prev, anexo]);
      }
      setUploadProgress(100);
    } catch (err) {
      console.error('Erro no upload:', err);
      setError('Erro ao fazer upload. Tente novamente.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [movimentacao, anexos.length, username]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (canUpload) {
      handleFiles(e.dataTransfer.files);
    }
  }, [canUpload, handleFiles]);

  const handleFileSelect = useCallback((e) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  }, [handleFiles]);

  const handleDelete = useCallback(async (anexo) => {
    if (!movimentacao) return;
    setDeletingId(anexo.id);
    try {
      await deleteAttachment(movimentacao.id, anexo);
      setAnexos((prev) => prev.filter((a) => a.id !== anexo.id));
    } catch (err) {
      console.error('Erro ao excluir:', err);
      setError('Erro ao excluir anexo. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  }, [movimentacao]);

  const handleView = useCallback((anexo) => {
    if (anexo.fileType === 'application/pdf') {
      window.open(anexo.downloadURL, '_blank', 'noopener,noreferrer');
    } else {
      setLightboxUrl(anexo.downloadURL);
    }
  }, []);

  const isImage = (fileType) => fileType?.startsWith('image/');

  if (!movimentacao) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <AttachFileIcon color="primary" />
            <Typography variant="h6" component="span" fontWeight={600}>
              Anexos
            </Typography>
            <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 0.5 }}>
              - {movimentacao.material_description}
            </Typography>
            <Chip
              label={`${anexos.length}/${MAX_FILES}`}
              size="small"
              color={anexos.length >= MAX_FILES ? 'error' : 'default'}
              sx={{ ml: 'auto' }}
            />
          </Box>
          <IconButton
            aria-label="fechar"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8, color: theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
          {/* Drop Zone - only for admin */}
          {canUpload && (
            <DropZone
              isDragOver={isDragOver}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{ mb: 2 }}
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
              />
              <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="body1" fontWeight={500}>
                Arraste arquivos ou clique para selecionar
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Imagens e PDF (max 5MB cada)
              </Typography>
            </DropZone>
          )}

          {/* Upload Progress */}
          {uploading && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Enviando...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {Math.round(uploadProgress)}%
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ borderRadius: 4 }} />
            </Box>
          )}

          {/* Error Alert */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {/* Empty State */}
          {anexos.length === 0 && !uploading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FileIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                Nenhum anexo adicionado
              </Typography>
              {isAdmin && (
                <Typography variant="caption" color="text.secondary">
                  Use a área acima para enviar comprovantes
                </Typography>
              )}
            </Box>
          )}

          {/* Attachment Grid */}
          {anexos.length > 0 && (
            <Grid container spacing={2}>
              {anexos.map((anexo) => (
                <Grid item xs={12} sm={6} md={4} key={anexo.id}>
                  <AttachmentCard elevation={1}>
                    {/* Preview */}
                    {isImage(anexo.fileType) ? (
                      <CardMedia
                        component="img"
                        height="140"
                        image={anexo.downloadURL}
                        alt={anexo.fileName}
                        sx={{
                          objectFit: 'cover',
                          cursor: 'pointer',
                          backgroundColor: alpha(theme.palette.grey[200], 0.5),
                        }}
                        onClick={() => handleView(anexo)}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 140,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: alpha(theme.palette.error.main, 0.05),
                          cursor: 'pointer',
                        }}
                        onClick={() => handleView(anexo)}
                      >
                        <PdfIcon sx={{ fontSize: 56, color: 'error.main' }} />
                      </Box>
                    )}

                    <CardContent sx={{ py: 1, px: 1.5, flex: 1 }}>
                      <Tooltip title={anexo.fileName}>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          noWrap
                          sx={{ mb: 0.25 }}
                        >
                          {anexo.fileName}
                        </Typography>
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatFileSize(anexo.fileSize)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {anexo.uploadedBy} em{' '}
                        {new Date(anexo.uploadedAt).toLocaleDateString('pt-BR')}
                      </Typography>
                    </CardContent>

                    <CardActions sx={{ pt: 0, px: 1.5, pb: 1 }}>
                      <Tooltip title="Visualizar">
                        <IconButton size="small" onClick={() => handleView(anexo)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isAdmin && (
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(anexo)}
                            disabled={deletingId === anexo.id}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </CardActions>
                  </AttachmentCard>
                </Grid>
              ))}
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: { xs: 2, sm: 2 } }}>
          <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: 2 }} fullWidth={isMobile}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lightbox */}
      <Dialog
        open={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor: 'transparent',
            boxShadow: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setLightboxUrl(null)}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
            }}
          >
            <CloseIcon />
          </IconButton>
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Visualização"
              style={{
                width: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                display: 'block',
                borderRadius: 12,
              }}
            />
          )}
        </Box>
      </Dialog>
    </>
  );
}
