import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  Typography,
  Chip,
  Skeleton,
  Fade,
  Popover,
  Divider,
  IconButton,
  Tooltip,
  alpha,
  styled,
  useMediaQuery
} from '@mui/material';
import {
  Info as InfoIcon,
  TableChart as TableIcon,
  KeyboardArrowDown as ArrowDownIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const StyledTableContainer = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: theme.shadows[2],
  transition: 'all 0.3s ease-in-out',
}));

const StyledTableHead = styled(TableHead)(({ theme, headercolor }) => ({
  background: headercolor
    ? `linear-gradient(135deg, ${theme.palette[headercolor]?.main || theme.palette.primary.main} 0%, ${theme.palette[headercolor]?.dark || theme.palette.primary.dark} 100%)`
    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    transform: 'scale(1.002)',
  },
  '&:nth-of-type(even)': {
    backgroundColor: alpha(theme.palette.grey[100], 0.5),
  },
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
}));

const HeaderCell = styled(TableCell)(({ theme }) => ({
  color: 'white',
  fontWeight: 600,
  fontSize: '0.85rem',
  letterSpacing: '0.03em',
  padding: theme.spacing(2),
  whiteSpace: 'nowrap',
}));

const EmptyStateContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(8, 2),
  textAlign: 'center',
  color: theme.palette.text.secondary,
}));

const SearchResultsTable = ({
  data = [],
  columns = [],
  loading = false,
  emptyMessage = "Nenhum resultado encontrado",
  emptyIcon = null,
  headerColor = "primary",
  title = null,
  subtitle = null,
  onRowClick = null,
  showPagination = true,
  rowsPerPageOptions = [10, 25, 50],
  defaultRowsPerPage = 10,
  renderPopover = null,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [anchorEls, setAnchorEls] = useState({});
  const [hoverTimers, setHoverTimers] = useState({});

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMouseEnter = (event, rowId) => {
    if (!renderPopover) return;

    if (hoverTimers[rowId]) {
      clearTimeout(hoverTimers[rowId]);
    }

    const timer = setTimeout(() => {
      setAnchorEls((prev) => ({
        ...prev,
        [rowId]: {
          anchorEl: event.currentTarget,
          open: true,
        },
      }));
    }, 500);

    setHoverTimers((prev) => ({
      ...prev,
      [rowId]: timer,
    }));
  };

  const handleMouseLeave = (rowId) => {
    if (hoverTimers[rowId]) {
      clearTimeout(hoverTimers[rowId]);
    }

    setAnchorEls((prev) => ({
      ...prev,
      [rowId]: {
        anchorEl: null,
        open: false,
      },
    }));
  };

  // Get visible columns based on screen size
  const visibleColumns = columns.filter(col => {
    if (isMobile && col.hideOnMobile) return false;
    return true;
  });

  // Calculate paginated data
  const paginatedData = showPagination
    ? data.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
    : data;

  // Loading skeleton
  const renderLoadingSkeleton = () => (
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        {visibleColumns.map((col, colIndex) => (
          <StyledTableCell key={`skeleton-cell-${colIndex}`}>
            <Skeleton variant="text" height={24} />
          </StyledTableCell>
        ))}
      </TableRow>
    ))
  );

  return (
    <StyledTableContainer>
      {/* Header Section */}
      {(title || subtitle || data.length > 0) && (
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette[headerColor]?.main || theme.palette.primary.main} 0%, ${theme.palette[headerColor]?.dark || theme.palette.primary.dark} 100%)`,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TableIcon sx={{ color: 'white', fontSize: 24 }} />
            <Box>
              {title && (
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          <Chip
            label={`${data.length} registro${data.length !== 1 ? 's' : ''}`}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: 600,
            }}
          />
        </Box>
      )}

      {/* Table Content */}
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: isMobile ? 600 : 800 }}>
          <StyledTableHead headercolor={headerColor}>
            <TableRow>
              {visibleColumns.map((column, index) => (
                <HeaderCell
                  key={column.field || index}
                  sx={{
                    textAlign: column.align || 'left',
                    minWidth: column.minWidth || 'auto',
                    width: column.width || 'auto',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {column.icon}
                    {column.headerName}
                  </Box>
                </HeaderCell>
              ))}
            </TableRow>
          </StyledTableHead>

          <TableBody>
            {loading ? (
              renderLoadingSkeleton()
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length} sx={{ p: 0 }}>
                  <EmptyStateContainer>
                    {emptyIcon && (
                      <Box sx={{ mb: 2, color: 'text.disabled' }}>
                        {emptyIcon}
                      </Box>
                    )}
                    <Typography variant="h6" gutterBottom>
                      {emptyMessage}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tente ajustar os filtros ou realizar uma nova busca
                    </Typography>
                  </EmptyStateContainer>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <Fade in={true} timeout={200 + rowIndex * 30} key={row.id || rowIndex}>
                  <StyledTableRow
                    onClick={() => onRowClick && onRowClick(row)}
                    onMouseEnter={(e) => handleMouseEnter(e, row.id || rowIndex)}
                    onMouseLeave={() => handleMouseLeave(row.id || rowIndex)}
                  >
                    {visibleColumns.map((column, colIndex) => (
                      <StyledTableCell
                        key={column.field || colIndex}
                        sx={{ textAlign: column.align || 'left' }}
                      >
                        {column.renderCell
                          ? column.renderCell(row)
                          : column.valueFormatter
                            ? column.valueFormatter(row[column.field], row)
                            : row[column.field] || '-'
                        }
                      </StyledTableCell>
                    ))}

                    {/* Popover for row details */}
                    {renderPopover && (
                      <Popover
                        id={`popover-${row.id || rowIndex}`}
                        sx={{ pointerEvents: 'none' }}
                        open={Boolean(anchorEls[row.id || rowIndex]?.open)}
                        anchorEl={anchorEls[row.id || rowIndex]?.anchorEl}
                        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
                        onClose={() => handleMouseLeave(row.id || rowIndex)}
                        disableRestoreFocus
                      >
                        <Card sx={{ maxWidth: 350, p: 2 }}>
                          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                            {renderPopover(row)}
                          </CardContent>
                        </Card>
                      </Popover>
                    )}
                  </StyledTableRow>
                </Fade>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      {/* Pagination */}
      {showPagination && data.length > 0 && (
        <TablePagination
          component="div"
          count={data.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={rowsPerPageOptions}
          labelRowsPerPage="Linhas por pagina:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
          sx={{
            borderTop: 1,
            borderColor: 'divider',
            '.MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              justifyContent: 'center',
            },
          }}
        />
      )}
    </StyledTableContainer>
  );
};

export default SearchResultsTable;
