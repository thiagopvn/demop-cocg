import { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, Box, InputAdornment, TextField, Typography } from '@mui/material';
import { caixaAlta, cnpjValido, formatarCnpj, somenteDigitos } from '../../services/orcamentoService';

const raio = { '& .MuiOutlinedInput-root': { borderRadius: 2 } };

/* ------------------------------------------------------------------ */
/* Valor em reais                                                      */
/* ------------------------------------------------------------------ */

const fmt = (n) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/**
 * Campo de dinheiro: o militar digita só os números e o campo formata em centavos
 * ("1234" -> "12,34"). `value` é número (ou '' quando vazio); `onChange(numero|'')`.
 * `permitirNegativo` é usado no ajuste de caixa (pode ser para menos).
 */
export function CampoMoeda({ value, onChange, label = 'Valor', permitirNegativo = false, required = false, helperText, error, autoFocus, size = 'small', sx, ...rest }) {
    const [texto, setTexto] = useState(value === '' || value == null ? '' : fmt(Math.abs(value)));
    const [negativo, setNegativo] = useState(Number(value) < 0);
    // Último valor emitido: quando o pai devolve o mesmo valor, o texto digitado é mantido
    // (senão um "-" sozinho ou "0," sumiriam enquanto o militar digita).
    const emitido = useRef(value);

    useEffect(() => {
        if (value === emitido.current) return;
        emitido.current = value;
        setTexto(value === '' || value == null ? '' : fmt(Math.abs(value)));
        setNegativo(Number(value) < 0);
    }, [value]);

    const handle = (e) => {
        const bruto = e.target.value;
        const neg = permitirNegativo && bruto.includes('-');
        const d = somenteDigitos(bruto).replace(/^0+(?=\d)/, '');
        setNegativo(neg);
        if (!d) { setTexto(''); emitido.current = ''; onChange?.(''); return; }
        const n = Number(d) / 100;
        const v = neg ? -n : n;
        setTexto(fmt(n));
        emitido.current = v;
        onChange?.(v);
    };

    return (
        <TextField
            size={size}
            label={label}
            value={negativo && texto ? `-${texto}` : texto}
            onChange={handle}
            required={required}
            error={error}
            helperText={helperText}
            autoFocus={autoFocus}
            placeholder="0,00"
            slotProps={{
                input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> },
                htmlInput: { inputMode: 'decimal', style: { fontWeight: 700, textAlign: 'right' } },
            }}
            sx={{ ...raio, ...sx }}
            {...rest}
        />
    );
}

/* ------------------------------------------------------------------ */
/* CNPJ com máscara e sugestão dos fornecedores já lançados            */
/* ------------------------------------------------------------------ */

/**
 * `value` são os 14 dígitos (ou parcial). `fornecedores` = [{ cnpj, cnpjFormatado, empresa }]
 * para sugerir enquanto digita; ao escolher um, `onEscolherFornecedor(f)` deixa o modal preencher a empresa.
 */
export function CampoCnpj({ value, onChange, fornecedores = [], onEscolherFornecedor, required = true, autoFocus, error, helperText, size = 'small', sx }) {
    const digitos = somenteDigitos(value);
    const completo = digitos.length === 14;
    const invalido = completo && !cnpjValido(digitos);
    const ajuda = helperText ?? (invalido ? 'CNPJ inválido — confira os dígitos' : completo ? 'CNPJ válido' : ' ');

    return (
        <Autocomplete
            freeSolo
            size={size}
            options={fornecedores}
            value={null}
            inputValue={formatarCnpj(digitos)}
            onInputChange={(_, v, motivo) => { if (motivo === 'reset') return; onChange?.(somenteDigitos(v).slice(0, 14)); }}
            onChange={(_, opt) => {
                if (opt && typeof opt === 'object') { onChange?.(opt.cnpj); onEscolherFornecedor?.(opt); }
            }}
            getOptionLabel={(o) => (typeof o === 'string' ? o : formatarCnpj(o.cnpj))}
            filterOptions={(opts, { inputValue }) => {
                const d = somenteDigitos(inputValue);
                const t = caixaAlta(inputValue).trim();
                if (!d && !t) return opts.slice(0, 8);
                return opts.filter((o) => (d && o.cnpj.includes(d)) || (t && o.empresa && o.empresa.includes(t))).slice(0, 8);
            }}
            renderOption={(props, o) => (
                <Box component="li" {...props} key={o.cnpj} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start !important' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{o.cnpjFormatado || formatarCnpj(o.cnpj)}</Typography>
                    {o.empresa && <Typography variant="caption" color="text.secondary">{o.empresa}</Typography>}
                </Box>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="CNPJ da empresa"
                    required={required}
                    autoFocus={autoFocus}
                    error={error || invalido}
                    helperText={ajuda}
                    placeholder="00.000.000/0000-00"
                    slotProps={{ ...params.slotProps, htmlInput: { ...params.inputProps, inputMode: 'numeric', style: { fontFamily: 'monospace', fontWeight: 600 } } }}
                    sx={raio}
                />
            )}
            sx={sx}
        />
    );
}

/* ------------------------------------------------------------------ */
/* Militar (nome de guerra + RG) com autopreenchimento                  */
/* ------------------------------------------------------------------ */

/**
 * Digita-se o nome de guerra (livre, em caixa alta); a lista sugere os militares do GOCG
 * (relatório da DGP) e os já lançados. Escolher um preenche nome e RG. Também aceita
 * digitar o RG para achar o militar.
 * `value` = { militarNome, militarRg }; `onChange({ militarNome, militarRg })`.
 */
export function CampoMilitar({ value, onChange, sugestoes = [], label = 'Militar que comprou', size = 'small', larguraRg = 150, sx }) {
    const nome = value?.militarNome || '';
    const rg = value?.militarRg || '';

    const opcoes = useMemo(() => sugestoes, [sugestoes]);
    const filtrar = (opts, { inputValue }) => {
        const t = caixaAlta(inputValue).trim();
        const d = somenteDigitos(inputValue);
        if (!t) return opts.slice(0, 12);
        const comeca = [];
        const contem = [];
        for (const o of opts) {
            if (o.nomeGuerra.startsWith(t) || (d.length >= 3 && o.rg.startsWith(d))) comeca.push(o);
            else if (o.nomeGuerra.includes(t) || (d.length >= 3 && o.rg.includes(d))) contem.push(o);
            if (comeca.length >= 12) break;
        }
        return [...comeca, ...contem].slice(0, 12);
    };

    return (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', ...sx }}>
            <Autocomplete
                freeSolo
                size={size}
                options={opcoes}
                inputValue={nome}
                value={null}
                onInputChange={(_, v, motivo) => { if (motivo === 'reset') return; onChange?.({ militarNome: caixaAlta(v), militarRg: rg }); }}
                onChange={(_, opt) => {
                    if (opt && typeof opt === 'object') onChange?.({ militarNome: opt.nomeGuerra, militarRg: opt.rg });
                }}
                getOptionLabel={(o) => (typeof o === 'string' ? o : o.nomeGuerra)}
                filterOptions={filtrar}
                renderOption={(props, o) => (
                    <Box component="li" {...props} key={`${o.nomeGuerra}|${o.rg}`} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>{o.nomeGuerra}</Typography>
                        {o.rg && <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>RG {o.rg}</Typography>}
                    </Box>
                )}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={label}
                        placeholder="Nome de guerra"
                        slotProps={{ ...params.slotProps, htmlInput: { ...params.inputProps, style: { textTransform: 'uppercase' } } }}
                        sx={raio}
                    />
                )}
                sx={{ flex: 1, minWidth: 200 }}
            />
            <TextField
                size={size}
                label="RG"
                value={rg}
                onChange={(e) => onChange?.({ militarNome: nome, militarRg: somenteDigitos(e.target.value).slice(0, 10) })}
                placeholder="0000000"
                slotProps={{ htmlInput: { inputMode: 'numeric', style: { fontFamily: 'monospace' } } }}
                sx={{ width: larguraRg, ...raio }}
            />
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* Texto livre em caixa alta com sugestões do que já foi digitado       */
/* ------------------------------------------------------------------ */

export function CampoTextoSugestoes({ value, onChange, sugestoes = [], label, placeholder, multiline = false, minRows, size = 'small', sx, ...rest }) {
    const filtrar = (opts, { inputValue }) => {
        const t = caixaAlta(inputValue).trim();
        if (!t) return opts.slice(0, 8);
        return opts.filter((o) => o.includes(t)).slice(0, 8);
    };
    return (
        <Autocomplete
            freeSolo
            size={size}
            options={sugestoes}
            inputValue={value || ''}
            value={null}
            onInputChange={(_, v, motivo) => { if (motivo === 'reset') return; onChange?.(caixaAlta(v)); }}
            onChange={(_, opt) => { if (typeof opt === 'string') onChange?.(caixaAlta(opt)); }}
            filterOptions={filtrar}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={placeholder}
                    multiline={multiline}
                    minRows={minRows}
                    slotProps={{ ...params.slotProps, htmlInput: { ...params.inputProps, style: { textTransform: 'uppercase' } } }}
                    sx={raio}
                    {...rest}
                />
            )}
            sx={sx}
        />
    );
}

/** TextField comum que converte para caixa alta ao digitar. */
export function CampoCaixaAlta({ value, onChange, size = 'small', sx, ...rest }) {
    return (
        <TextField
            size={size}
            value={value || ''}
            onChange={(e) => onChange?.(caixaAlta(e.target.value))}
            slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }}
            sx={{ ...raio, ...sx }}
            {...rest}
        />
    );
}
