import { useEffect, useRef, useState } from 'react';
import { IconButton, InputAdornment, TextField, Tooltip, alpha } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';

/**
 * Campo de quantidade com botoes − / + e digitacao livre.
 *
 * Por que existe: um `<input type="number">` com `onChange={Math.max(1, parseInt(v) || 1)}`
 * nao deixa o usuario apagar o valor para digitar outro — ao limpar "5" o campo volta
 * para "1" e o 1 gruda. Aqui o texto digitado fica como esta (inclusive vazio) enquanto
 * o campo tem foco; o valor so e normalizado (limitado a min/max) ao sair do campo ou
 * apertar Enter. Ao focar, o conteudo e selecionado para que digitar ja substitua.
 *
 * `onChange(valor)` recebe um numero, ou `''` enquanto o campo esta vazio — quem usa
 * trata `''` como "ainda nao informado".
 *
 * @param {number|''} value
 * @param {(v: number|'') => void} onChange
 * @param {number} [min=1]
 * @param {number} [max]            limite rigido (os botoes param nele); omita para nao limitar
 * @param {string} [helper]         texto pequeno abaixo do campo
 * @param {boolean} [helperDestaque] pinta o helper em cor de aviso
 */
export default function QuantidadeField({
    value,
    onChange,
    min = 1,
    max,
    label = 'Qtd',
    size = 'small',
    disabled = false,
    autoFocus = false,
    helper,
    helperDestaque = false,
    width = 148,
    sx,
    inputProps,
    'aria-label': ariaLabel,
}) {
    const [texto, setTexto] = useState(value === '' || value === null || value === undefined ? '' : String(value));
    const focado = useRef(false);
    // O mouseup que segue o clique desfaz o select() feito no focus e deixa o cursor
    // entre os digitos; por isso a selecao e refeita (uma vez) no mouseup.
    const selecionarNoMouseUp = useRef(false);

    // Sincroniza com o valor externo quando o campo nao esta sendo editado.
    useEffect(() => {
        if (focado.current) return;
        setTexto(value === '' || value === null || value === undefined ? '' : String(value));
    }, [value]);

    const limitar = (n) => {
        let v = Math.floor(Number(n));
        if (!Number.isFinite(v)) return min;
        if (Number.isFinite(min)) v = Math.max(min, v);
        if (Number.isFinite(max)) v = Math.min(max, v);
        return v;
    };

    const emitir = (n) => {
        const v = limitar(n);
        setTexto(String(v));
        onChange?.(v);
    };

    const handleTexto = (e) => {
        // So digitos: evita "e", "-", "," que o type=number aceitaria silenciosamente.
        const limpo = e.target.value.replace(/[^\d]/g, '');
        setTexto(limpo);
        if (limpo === '') {
            onChange?.('');
            return;
        }
        const n = Number(limpo);
        // Enquanto digita, respeita so o teto (o piso e aplicado ao sair, senao "1" gruda).
        onChange?.(Number.isFinite(max) ? Math.min(max, n) : n);
    };

    const confirmar = () => {
        focado.current = false;
        emitir(texto === '' ? min : texto);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur(); // e.target e o <input>; currentTarget seria o FormControl
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            emitir((Number(texto) || 0) + 1);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            emitir((Number(texto) || 0) - 1);
        }
    };

    const atual = Number(texto) || 0;
    const podeDiminuir = !disabled && atual > min;
    const podeAumentar = !disabled && (!Number.isFinite(max) || atual < max);

    return (
        <TextField
            size={size}
            label={label}
            value={texto}
            onChange={handleTexto}
            onBlur={confirmar}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoFocus={autoFocus}
            helperText={helper}
            slotProps={{
                htmlInput: {
                    // Handlers no <input> em si (no TextField, currentTarget seria o FormControl).
                    onFocus: (e) => { focado.current = true; selecionarNoMouseUp.current = true; e.target.select(); },
                    onMouseUp: (e) => {
                        if (!selecionarNoMouseUp.current) return;
                        selecionarNoMouseUp.current = false;
                        e.preventDefault();
                        e.target.select();
                    },
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    'aria-label': ariaLabel || label,
                    style: { textAlign: 'center', fontWeight: 700, padding: '8px 0', MozAppearance: 'textfield' },
                    ...inputProps,
                },
                input: {
                    startAdornment: (
                        <InputAdornment position="start" sx={{ ml: -0.75, mr: 0 }}>
                            <Tooltip title="Menos 1" disableInteractive>
                                <span>
                                    <IconButton
                                        size="small"
                                        edge="start"
                                        aria-label="Diminuir quantidade"
                                        tabIndex={-1}
                                        disabled={!podeDiminuir}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => emitir(atual - 1)}
                                        sx={{ borderRadius: 1.5 }}
                                    >
                                        <Remove sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end" sx={{ mr: -0.75, ml: 0 }}>
                            <Tooltip title="Mais 1" disableInteractive>
                                <span>
                                    <IconButton
                                        size="small"
                                        edge="end"
                                        aria-label="Aumentar quantidade"
                                        tabIndex={-1}
                                        disabled={!podeAumentar}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => emitir(atual + 1)}
                                        sx={{ borderRadius: 1.5 }}
                                    >
                                        <Add sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </InputAdornment>
                    ),
                },
                formHelperText: {
                    sx: {
                        mx: 0.5,
                        mt: 0.25,
                        lineHeight: 1.2,
                        textAlign: 'center',
                        ...(helperDestaque ? { color: 'warning.main', fontWeight: 600 } : {}),
                    },
                },
            }}
            sx={{
                width,
                flexShrink: 0,
                '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    pl: 0.75,
                    pr: 0.75,
                    bgcolor: (t) => (disabled ? 'transparent' : alpha(t.palette.primary.main, 0.02)),
                },
                '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                ...sx,
            }}
        />
    );
}
