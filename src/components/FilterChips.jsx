import React from 'react';
import {
  Box,
  Chip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
  styled,
  useMediaQuery
} from '@mui/material';
import {
  FilterList as FilterIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const FilterContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: alpha(theme.palette.grey[100], 0.5),
  borderRadius: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const ChipsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing(1),
}));

const StyledChip = styled(Chip)(({ theme, selected, chipcolor }) => ({
  fontWeight: selected ? 600 : 500,
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
  borderWidth: selected ? 2 : 1,
  backgroundColor: selected
    ? alpha(theme.palette[chipcolor]?.main || theme.palette.primary.main, 0.12)
    : 'transparent',
  borderColor: selected
    ? theme.palette[chipcolor]?.main || theme.palette.primary.main
    : theme.palette.divider,
  color: selected
    ? theme.palette[chipcolor]?.main || theme.palette.primary.main
    : theme.palette.text.secondary,
  '&:hover': {
    backgroundColor: alpha(theme.palette[chipcolor]?.main || theme.palette.primary.main, 0.08),
    borderColor: theme.palette[chipcolor]?.main || theme.palette.primary.main,
    transform: 'translateY(-1px)',
    boxShadow: theme.shadows[2],
  },
  '& .MuiChip-icon': {
    color: 'inherit',
  },
}));

const FilterChips = ({
  filters = [],
  activeFilter,
  onFilterChange,
  title = "Filtros",
  showTitle = true,
  selectFilters = [],
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <FilterContainer>
      {showTitle && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
            {title}
          </Typography>
        </Box>
      )}

      <ChipsContainer>
        {filters.map((filter) => (
          <StyledChip
            key={filter.value}
            icon={filter.icon}
            label={isMobile && filter.shortLabel ? filter.shortLabel : filter.label}
            variant="outlined"
            selected={activeFilter === filter.value ? 1 : 0}
            chipcolor={filter.color || 'primary'}
            onClick={() => onFilterChange(filter.value)}
            size={isMobile ? "small" : "medium"}
          />
        ))}
      </ChipsContainer>

      {/* Select Filters (like Category) */}
      {selectFilters.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
          {selectFilters.map((selectFilter) => (
            <FormControl
              key={selectFilter.field}
              size="small"
              sx={{ minWidth: 150 }}
            >
              <InputLabel id={`${selectFilter.field}-label`}>
                {selectFilter.label}
              </InputLabel>
              <Select
                labelId={`${selectFilter.field}-label`}
                id={selectFilter.field}
                value={selectFilter.value}
                label={selectFilter.label}
                onChange={(e) => selectFilter.onChange(e.target.value)}
                sx={{
                  backgroundColor: 'background.paper',
                  borderRadius: 2,
                }}
              >
                <MenuItem value="">
                  <em>Todas</em>
                </MenuItem>
                {selectFilter.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </Box>
      )}
    </FilterContainer>
  );
};

export default FilterChips;
