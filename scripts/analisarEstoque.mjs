// Script SOMENTE LEITURA: cruza as quantidades dos materiais com alocações em locais,
// itens em viatura e movimentações abertas, e lista as inconsistências.
//
// Uso:  node scripts/analisarEstoque.mjs
//       (pede RG/username e senha; ou use DEMOP_USERNAME / DEMOP_PASSWORD no ambiente)
//
// Nada é gravado no Firestore. O relatório completo vai para um JSON na pasta
// temporária do sistema (caminho impresso no final).
//
// Modelo esperado (ver CLAUDE.md):
//   estoque_total = estoque_atual + estoque_viatura + cautelado (aberto) + em reparo (aberto)
//   estoque_viatura = soma de viatura_materiais com status 'alocado'
//   unidadesDemop = estoque_total - estoque_viatura ; alocado em locais <= unidadesDemop
//   qtd_inoperante <= estoque_total
import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const promptPassword = (prompt) =>
  new Promise((resolveFn) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    stdin.resume();
    stdin.setEncoding('utf8');
    if (stdin.isTTY) stdin.setRawMode(true);
    let pwd = '';
    const onData = (ch) => {
      for (const c of ch.toString('utf8')) {
        if (c === '\n' || c === '\r' || c === '') {
          if (stdin.isTTY) stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolveFn(pwd);
          return;
        }
        if (c === '') process.exit(130);
        if (c === '' || c === '\b') {
          if (pwd.length > 0) { pwd = pwd.slice(0, -1); process.stdout.write('\b \b'); }
        } else {
          pwd += c;
          process.stdout.write('*');
        }
      }
    };
    stdin.on('data', onData);
  });

const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

async function main() {
  console.log('=== Análise de quantidades dos materiais (somente leitura) ===\n');
  if (!firebaseConfig.apiKey) {
    console.error('Config do Firebase não encontrada. Garanta que o .env está populado.');
    process.exit(1);
  }

  let username = process.env.DEMOP_USERNAME;
  let password = process.env.DEMOP_PASSWORD;
  if (!username || !password) {
    const rl = readline.createInterface({ input, output });
    username = (await rl.question('RG / username: ')).trim();
    rl.close();
    password = await promptPassword('Senha: ');
  }
  if (!username || !password) { console.error('Username/senha obrigatórios.'); process.exit(1); }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, 'southamerica-east1');
  const verifyLogin = httpsCallable(functions, 'verifyLogin');

  let userData;
  try {
    userData = (await verifyLogin({ username, password })).data;
  } catch (err) {
    console.error('Falha na Cloud Function verifyLogin:', err?.code || err?.message || err);
    process.exit(2);
  }
  if (!userData?.customToken) { console.error('Resposta inválida da verifyLogin.'); process.exit(2); }
  await signInWithCustomToken(auth, userData.customToken);
  console.log(`Autenticado como ${userData.username} (role=${userData.role})\n`);

  console.log('Lendo coleções...');
  const [matSnap, locSnap, vmSnap, cautSnap, repSnap] = await Promise.all([
    getDocs(collection(db, 'materials')),
    getDocs(collection(db, 'material_locais')),
    getDocs(query(collection(db, 'viatura_materiais'), where('status', '==', 'alocado'))),
    getDocs(query(collection(db, 'movimentacoes'), where('type', '==', 'cautela'), where('status', '==', 'cautelado'))),
    getDocs(query(collection(db, 'movimentacoes'), where('type', '==', 'reparo'), where('status', '==', 'emReparo'))),
  ]);
  console.log(`materials=${matSnap.size} material_locais=${locSnap.size} viatura_materiais(alocado)=${vmSnap.size} cautelas abertas=${cautSnap.size} reparos abertos=${repSnap.size}\n`);

  const soma = (snap, chaveMat, chaveQtd) => {
    const m = new Map();
    snap.forEach((d) => {
      const x = d.data();
      const id = x[chaveMat];
      if (!id) return;
      m.set(id, (m.get(id) || 0) + n(x[chaveQtd]));
    });
    return m;
  };
  const alocadoPor = soma(locSnap, 'material_id', 'quantidade');
  const locaisPor = new Map();
  locSnap.forEach((d) => { const x = d.data(); if (!locaisPor.has(x.material_id)) locaisPor.set(x.material_id, []); locaisPor.get(x.material_id).push(`${x.local_nome} ×${n(x.quantidade)}`); });
  const viaturaCalcPor = soma(vmSnap, 'material_id', 'quantidade');
  const cauteladoPor = soma(cautSnap, 'material', 'quantity');
  const reparoPor = soma(repSnap, 'material', 'quantity');

  const linhas = [];
  matSnap.forEach((d) => {
    const m = d.data();
    const total = n(m.estoque_total);
    const atual = n(m.estoque_atual);
    const viatura = n(m.estoque_viatura);
    const inop = Number.isFinite(Number(m.qtd_inoperante)) ? n(m.qtd_inoperante) : null;
    const cautelado = cauteladoPor.get(d.id) || 0;
    const reparo = reparoPor.get(d.id) || 0;
    const alocado = alocadoPor.get(d.id) || 0;
    const viaturaCalc = viaturaCalcPor.get(d.id) || 0;
    const totalEfetivo = Math.max(total, atual + viatura);
    const unidadesDemop = Math.max(0, totalEfetivo - viatura);
    const esperado = atual + viatura + cautelado + reparo;

    const problemas = [];
    if (atual + viatura > total) problemas.push({ tipo: 'TOTAL_DEFASADO', msg: `total ${total} < disponível ${atual} + viatura ${viatura} (= ${atual + viatura})` });
    if (esperado !== total && !(atual + viatura > total)) problemas.push({ tipo: 'BALANCO', msg: `total ${total} ≠ disponível ${atual} + viatura ${viatura} + cautelado ${cautelado} + reparo ${reparo} (= ${esperado}); diferença ${total - esperado}` });
    else if (atual + viatura > total && cautelado + reparo > 0) problemas.push({ tipo: 'BALANCO', msg: `além do total defasado, há ${cautelado} cautelado + ${reparo} em reparo não contidos no total` });
    if (viatura !== viaturaCalc) problemas.push({ tipo: 'VIATURA_DIVERGE', msg: `estoque_viatura ${viatura} ≠ soma em viatura_materiais ${viaturaCalc}` });
    if (alocado > unidadesDemop) problemas.push({ tipo: 'LOCAL_EXCEDENTE', msg: `guardado em locais ${alocado} > unidades no DEMOP ${unidadesDemop}` });
    if (inop !== null && inop > totalEfetivo) problemas.push({ tipo: 'INOPERANTE_MAIOR_QUE_TOTAL', msg: `qtd_inoperante ${inop} > total ${totalEfetivo}` });
    if (atual < 0 || viatura < 0 || total < 0) problemas.push({ tipo: 'NEGATIVO', msg: `valores negativos: total ${total}, disponível ${atual}, viatura ${viatura}` });
    if (m.estoque_total === undefined || m.estoque_total === null) problemas.push({ tipo: 'SEM_TOTAL', msg: 'campo estoque_total ausente' });
    if (!Number.isInteger(n(m.estoque_total)) || !Number.isInteger(n(m.estoque_atual)) || !Number.isInteger(n(m.estoque_viatura))) problemas.push({ tipo: 'NAO_INTEIRO', msg: `valores não inteiros: ${m.estoque_total} / ${m.estoque_atual} / ${m.estoque_viatura}` });
    if (typeof m.estoque_total === 'string' || typeof m.estoque_atual === 'string' || typeof m.estoque_viatura === 'string') problemas.push({ tipo: 'TIPO_STRING', msg: 'quantidade gravada como texto' });

    linhas.push({
      id: d.id,
      description: m.description || '',
      categoria: m.categoria || '',
      total, atual, viatura, inop, cautelado, reparo, alocado, viaturaCalc, unidadesDemop,
      semLocal: Math.max(0, unidadesDemop - alocado),
      locais: locaisPor.get(d.id) || [],
      status: m.maintenance_status || 'operante',
      problemas,
    });
  });

  const comProblema = linhas.filter((l) => l.problemas.length > 0);
  const porTipo = {};
  for (const l of comProblema) for (const p of l.problemas) porTipo[p.tipo] = (porTipo[p.tipo] || 0) + 1;
  const semLocal = linhas.filter((l) => l.semLocal > 0);

  console.log('=== RESUMO ===');
  console.log(`Materiais: ${linhas.length} | com alguma inconsistência: ${comProblema.length} | com unidades sem local (pendência, não erro): ${semLocal.length}`);
  for (const [tipo, qtd] of Object.entries(porTipo).sort((a, b) => b[1] - a[1])) console.log(`  ${tipo.padEnd(28)} ${qtd}`);

  console.log('\n=== DETALHE (ordenado por tipo) ===');
  const ordem = Object.keys(porTipo).sort((a, b) => porTipo[b] - porTipo[a]);
  for (const tipo of ordem) {
    console.log(`\n--- ${tipo} (${porTipo[tipo]}) ---`);
    comProblema
      .filter((l) => l.problemas.some((p) => p.tipo === tipo))
      .sort((a, b) => a.description.localeCompare(b.description, 'pt-BR'))
      .forEach((l) => {
        const p = l.problemas.find((x) => x.tipo === tipo);
        console.log(`• ${l.description} [${l.categoria}]  total=${l.total} disp=${l.atual} viat=${l.viatura} caut=${l.cautelado} rep=${l.reparo} inop=${l.inop ?? '-'} locais=${l.alocado}`);
        console.log(`    ${p.msg}`);
      });
  }

  const saida = path.join(os.tmpdir(), 'demop-estoque-inconsistencias.json');
  fs.writeFileSync(saida, JSON.stringify({ geradoEm: new Date().toISOString(), resumo: { materiais: linhas.length, comProblema: comProblema.length, porTipo, semLocal: semLocal.length }, comProblema, semLocal: semLocal.map((l) => ({ id: l.id, description: l.description, semLocal: l.semLocal, unidadesDemop: l.unidadesDemop, locais: l.locais })), todos: linhas }, null, 2), 'utf8');
  console.log(`\nRelatório completo salvo em: ${saida}`);

  await signOut(auth);
  process.exit(0);
}

main().catch((e) => { console.error('Erro:', e?.message || e); process.exit(1); });
