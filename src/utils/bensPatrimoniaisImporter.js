import * as XLSX from 'xlsx';
import { bulkUpsertBensPatrimoniais } from '../firebase/bensPatrimoniaisService';

const stripAccents = (str) =>
  str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const normalizeKey = (key) => stripAccents(String(key || '')).replace(/[^a-z0-9]+/g, '_');

const HEADER_MAP = {
  id_patrimonio: [
    'patrimonio',
    'id_patrimonio',
    'numero_patrimonio',
    'n_patrimonio',
    'n_de_patrimonio',
    'n_patrim',
    'no_patrim',
    'num_patrimonio',
    'numero',
    'codigo',
  ],
  descricao: [
    'descricao',
    'descricao_do_item',
    'descricao_do_bem',
    'item',
    'material',
    'descricao_material',
  ],
  quantidade: ['quantidade', 'qtd', 'qtde'],
  valor: [
    'valor',
    'valor_unitario',
    'valor_unitario_ou_reavaliado',
    'preco',
    'valor_r',
  ],
  localidade: ['localidade', 'local', 'localizacao', 'localizacao_atual', 'destino'],
  aapat_processo_sei: [
    'aapat_e_processo_sei',
    'aapat_processo_sei',
    'aapat',
    'processo_sei',
    'aapat_sei',
    'aa_pat_e_processo_sei',
  ],
  observacoes: ['observacoes', 'observacao', 'obs', 'comentarios'],
  ultima_conferencia: [
    'ultima_conferencia',
    'data_ultima_conferencia',
    'data_e_hora_da_ultima_conferencia',
    'data_da_ultima_conferencia',
    'conferencia',
  ],
};

const matchHeaderToField = (rawHeader) => {
  const normalized = normalizeKey(rawHeader);
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.includes(normalized)) return field;
  }
  return null;
};

const parseNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const parseDate = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(v).trim();
  if (!s) return null;
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (brMatch) {
    const [, dd, mm, yyyy, hh = '0', mi = '0', ss = '0'] = brMatch;
    const year = yyyy.length === 2 ? 2000 + Number(yyyy) : Number(yyyy);
    const d = new Date(year, Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatBrlValue = (v) => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'string' && v.trim().startsWith('R$')) return v.trim();
  const n = parseNumber(v);
  if (n === null) return String(v);
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
};

export const mapRowToRecord = (row, headerMapping) => {
  const record = {};
  Object.entries(headerMapping).forEach(([rawHeader, field]) => {
    if (!field) return;
    const raw = row[rawHeader];
    if (raw === undefined || raw === null || raw === '') return;
    switch (field) {
      case 'quantidade': {
        const n = parseNumber(raw);
        record.quantidade = n === null ? 1 : Math.max(0, Math.round(n));
        break;
      }
      case 'valor':
        record.valor = formatBrlValue(raw);
        break;
      case 'id_patrimonio':
        record.id_patrimonio = typeof raw === 'number' ? raw : String(raw).trim();
        break;
      case 'ultima_conferencia': {
        const d = parseDate(raw);
        if (d) record.ultima_conferencia = d;
        break;
      }
      default:
        record[field] = typeof raw === 'string' ? raw.trim() : raw;
    }
  });
  return record;
};

export const parseWorkbook = (workbook) => {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { records: [], headerMapping: {}, unknownHeaders: [] };
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (rows.length === 0) return { records: [], headerMapping: {}, unknownHeaders: [] };

  const rawHeaders = Object.keys(rows[0]);
  const headerMapping = {};
  const unknownHeaders = [];
  rawHeaders.forEach((h) => {
    const field = matchHeaderToField(h);
    headerMapping[h] = field;
    if (!field) unknownHeaders.push(h);
  });

  const records = rows
    .map((r) => mapRowToRecord(r, headerMapping))
    .filter((r) => {
      const hasId = r.id_patrimonio !== undefined && r.id_patrimonio !== '' && r.id_patrimonio !== null;
      const hasDesc = typeof r.descricao === 'string' && r.descricao.length > 0;
      return hasId || hasDesc;
    });

  return { records, headerMapping, unknownHeaders };
};

export const readXlsxFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        resolve(workbook);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

export const importBensPatrimoniaisFromFile = async (file, { onProgress } = {}) => {
  if (!file) throw new Error('Arquivo não informado.');
  const workbook = await readXlsxFile(file);
  const { records, headerMapping, unknownHeaders } = parseWorkbook(workbook);
  if (records.length === 0) {
    return {
      created: 0,
      updated: 0,
      errors: [],
      total: 0,
      headerMapping,
      unknownHeaders,
      message: 'Nenhuma linha válida encontrada na planilha.',
    };
  }
  const result = await bulkUpsertBensPatrimoniais(records, onProgress);
  return {
    ...result,
    total: records.length,
    headerMapping,
    unknownHeaders,
  };
};
