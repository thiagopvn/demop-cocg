// Standalone Node script: uploads ARROLAMENTO_PLANILHA_2026.xlsx into Firestore
// Uses Firebase Web SDK + verifyLogin Cloud Function (custom token).
// Run with: node scripts/uploadBensPatrimoniais.js
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const xlsxPath = resolve(projectRoot, 'ARROLAMENTO_PLANILHA_2026.xlsx');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// ===== Parsing helpers (mirroring src/utils/bensPatrimoniaisImporter.js) =====
const stripAccents = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const normalizeKey = (k) => stripAccents(String(k || '')).replace(/[^a-z0-9]+/g, '_');

const HEADER_MAP = {
  id_patrimonio: ['patrimonio', 'id_patrimonio', 'numero_patrimonio', 'n_patrimonio', 'n_de_patrimonio', 'n_patrim', 'no_patrim', 'num_patrimonio', 'numero', 'codigo'],
  descricao: ['descricao', 'descricao_do_item', 'descricao_do_bem', 'item', 'material', 'descricao_material'],
  quantidade: ['quantidade', 'qtd', 'qtde'],
  valor: ['valor', 'valor_unitario', 'valor_unitario_ou_reavaliado', 'preco', 'valor_r'],
  localidade: ['localidade', 'local', 'localizacao', 'localizacao_atual', 'destino'],
  aapat_processo_sei: ['aapat_e_processo_sei', 'aapat_processo_sei', 'aapat', 'processo_sei', 'aapat_sei', 'aa_pat_e_processo_sei'],
  observacoes: ['observacoes', 'observacao', 'obs', 'comentarios'],
  ultima_conferencia: ['ultima_conferencia', 'data_ultima_conferencia', 'data_e_hora_da_ultima_conferencia', 'data_da_ultima_conferencia', 'conferencia'],
};

const matchHeader = (raw) => {
  const n = normalizeKey(raw);
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.includes(n)) return field;
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

const formatBrl = (v) => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'string' && v.trim().startsWith('R$')) return v.trim();
  const n = parseNumber(v);
  if (n === null) return String(v);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
};

const mapRow = (row, mapping) => {
  const rec = {};
  for (const [raw, field] of Object.entries(mapping)) {
    if (!field) continue;
    const v = row[raw];
    if (v === undefined || v === null || v === '') continue;
    switch (field) {
      case 'quantidade': {
        const n = parseNumber(v);
        rec.quantidade = n === null ? 1 : Math.max(0, Math.round(n));
        break;
      }
      case 'valor':
        rec.valor = formatBrl(v);
        break;
      case 'id_patrimonio':
        rec.id_patrimonio = typeof v === 'number' ? v : String(v).trim();
        break;
      case 'ultima_conferencia': {
        const d = parseDate(v);
        if (d) rec.ultima_conferencia = d;
        break;
      }
      default:
        rec[field] = typeof v === 'string' ? v.trim() : v;
    }
  }
  return rec;
};

const parseWorkbook = (wb) => {
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (rows.length === 0) return { records: [], mapping: {}, unknown: [] };
  const headers = Object.keys(rows[0]);
  const mapping = {};
  const unknown = [];
  headers.forEach((h) => {
    const f = matchHeader(h);
    mapping[h] = f;
    if (!f) unknown.push(h);
  });
  const records = rows
    .map((r) => mapRow(r, mapping))
    .filter((r) => {
      const hasId = r.id_patrimonio !== undefined && r.id_patrimonio !== '' && r.id_patrimonio !== null;
      const hasDesc = typeof r.descricao === 'string' && r.descricao.length > 0;
      return hasId || hasDesc;
    });
  return { records, mapping, unknown };
};

// ===== Hidden password prompt =====
const promptPassword = (prompt) =>
  new Promise((resolveFn) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.resume();
    stdin.setEncoding('utf8');
    if (stdin.isTTY) stdin.setRawMode(true);
    let pwd = '';
    const onData = (ch) => {
      const s = ch.toString('utf8');
      for (const c of s) {
        if (c === '\n' || c === '\r' || c === '') {
          if (stdin.isTTY) stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolveFn(pwd);
          return;
        }
        if (c === '') {
          process.exit(130);
        }
        if (c === '' || c === '\b') {
          if (pwd.length > 0) {
            pwd = pwd.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          pwd += c;
          process.stdout.write('*');
        }
      }
    };
    stdin.on('data', onData);
  });

// ===== Main =====
async function main() {
  console.log('=== Upload Bens Patrimoniais → Firestore ===\n');

  if (!existsSync(xlsxPath)) {
    console.error(`Arquivo não encontrado: ${xlsxPath}`);
    process.exit(1);
  }
  if (!firebaseConfig.apiKey) {
    console.error('Config do Firebase não encontrada. Garanta que o .env está populado.');
    process.exit(1);
  }

  const usernameArg = process.env.DEMOP_USERNAME;
  const passwordArg = process.env.DEMOP_PASSWORD;
  let username = usernameArg;
  let password = passwordArg;
  if (!username || !password) {
    const rl = readline.createInterface({ input, output });
    username = (await rl.question('Username: ')).trim();
    rl.close();
    password = await promptPassword('Senha: ');
  }
  if (!username || !password) {
    console.error('Username/senha obrigatórios.');
    process.exit(1);
  }

  console.log('\nLendo planilha...');
  const buffer = await readFile(xlsxPath);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const { records, mapping, unknown } = parseWorkbook(workbook);
  console.log(`Total de linhas válidas: ${records.length}`);
  console.log('Mapeamento de colunas:');
  Object.entries(mapping).forEach(([raw, field]) => {
    console.log(`  - "${raw}" → ${field || '(ignorado)'}`);
  });
  if (unknown.length) {
    console.log(`\nColunas ignoradas (não reconhecidas): ${unknown.join(', ')}`);
  }
  if (records.length === 0) {
    console.error('\nNenhum registro válido encontrado. Abortando.');
    process.exit(1);
  }

  console.log('\nAutenticando no Firebase via Cloud Function verifyLogin...');
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, 'southamerica-east1');
  const verifyLogin = httpsCallable(functions, 'verifyLogin');

  let userData;
  try {
    const result = await verifyLogin({ username, password });
    userData = result.data;
  } catch (err) {
    console.error('Falha na Cloud Function verifyLogin:', err?.code || err?.message || err);
    process.exit(2);
  }

  if (!userData?.customToken) {
    console.error('Resposta inválida da verifyLogin (sem customToken):', userData);
    process.exit(2);
  }

  try {
    await signInWithCustomToken(auth, userData.customToken);
    if (auth.currentUser) await auth.currentUser.getIdToken(true);
  } catch (err) {
    console.error('Falha em signInWithCustomToken:', err?.code || err?.message);
    process.exit(2);
  }
  console.log(`Autenticado como ${userData.username} (uid=${auth.currentUser?.uid}, role=${userData.role})`);

  // Verificar role via custom claims
  try {
    const tokenResult = await auth.currentUser.getIdTokenResult();
    const role = tokenResult.claims?.role;
    console.log(`Role do usuário: ${role || '(sem custom claim)'}`);
    if (role !== 'admingeral' && role !== 'BensPatrimoniais') {
      console.warn('AVISO: a role atual pode não permitir escrita em bens_patrimoniais. Verifique as Firestore rules.');
    }
  } catch (err) {
    console.warn('Não foi possível ler custom claims:', err.message);
  }

  console.log('\nLendo coleção bens_patrimoniais para detectar duplicatas...');
  const colRef = collection(db, 'bens_patrimoniais');
  const existingSnap = await getDocs(colRef);
  const byId = new Map();
  existingSnap.docs.forEach((d) => {
    const data = d.data();
    if (data?.id_patrimonio !== undefined && data?.id_patrimonio !== null) {
      byId.set(String(data.id_patrimonio), d.id);
    }
  });
  console.log(`Documentos existentes: ${existingSnap.size}`);

  const BATCH_LIMIT = 400;
  let batch = writeBatch(db);
  let ops = 0;
  let created = 0;
  let updated = 0;
  const errors = [];

  const commit = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  };

  console.log('\nIniciando upload em batches...');
  let processed = 0;
  for (const rec of records) {
    try {
      const idKey = rec.id_patrimonio !== undefined && rec.id_patrimonio !== ''
        ? String(rec.id_patrimonio)
        : null;
      const payload = {
        id_patrimonio: rec.id_patrimonio ?? '',
        descricao: (rec.descricao || '').toString().trim(),
        quantidade: Number.isFinite(Number(rec.quantidade)) ? Number(rec.quantidade) : 1,
        valor: rec.valor ?? '',
        localidade: (rec.localidade || '').toString().trim(),
        aapat_processo_sei: (rec.aapat_processo_sei || '').toString().trim(),
        observacoes: (rec.observacoes || '').toString().trim(),
        descricao_lower: (rec.descricao || '').toString().toLowerCase().trim(),
        updated_at: serverTimestamp(),
      };
      if (rec.ultima_conferencia instanceof Date) {
        payload.ultima_conferencia = rec.ultima_conferencia;
      }

      const existingDocId = idKey ? byId.get(idKey) : null;
      if (existingDocId) {
        batch.update(doc(db, 'bens_patrimoniais', existingDocId), payload);
        updated += 1;
      } else {
        const ref = doc(colRef);
        const createPayload = { ...payload, created_at: serverTimestamp() };
        if (!('ultima_conferencia' in createPayload)) createPayload.ultima_conferencia = null;
        batch.set(ref, createPayload);
        if (idKey) byId.set(idKey, ref.id);
        created += 1;
      }
      ops += 1;
      if (ops >= BATCH_LIMIT) {
        await commit();
        console.log(`  ${processed + 1}/${records.length} processados (${created} novos, ${updated} atualizados)`);
      }
    } catch (err) {
      errors.push({ record: rec, message: err?.message || String(err) });
    }
    processed += 1;
  }
  await commit();

  console.log('\n=== Resultado ===');
  console.log(`Criados:     ${created}`);
  console.log(`Atualizados: ${updated}`);
  console.log(`Erros:       ${errors.length}`);
  if (errors.length) {
    console.log('\nPrimeiros 5 erros:');
    errors.slice(0, 5).forEach((e, i) => {
      console.log(`  ${i + 1}. ${e.message} — id_patrimonio: ${e.record?.id_patrimonio}`);
    });
  }

  await signOut(auth);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(99);
});
