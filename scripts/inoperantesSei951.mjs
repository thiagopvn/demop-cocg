// Materiais enviados ao CSM pela CI SEDEC/CBMERJ/GOCG Nº 951 (SEI-270007/049044/2026).
//
//  - Cria as 9 dorsais SCOTT (8 com número de série + 1 sem série) já como inoperantes,
//    guardadas no local indicado e com movimentação de reparo + PDF do SEI anexado.
//  - Nos itens que já estão inoperantes (válvulas de demanda, peças faciais, motobombas,
//    motocortador) anexa o mesmo PDF na movimentação de reparo aberta, grava o nº do SEI
//    e o local de reparo.
//
// Uso:
//   node scripts/inoperantesSei951.mjs                 -> SIMULAÇÃO: só lê e imprime o plano
//   node scripts/inoperantesSei951.mjs --aplicar       -> grava no Firestore/Storage
//   opções: --pdf <caminho>  --local "<texto do local>"  --username <rg> --password <senha>
//   (sem username/senha usa DEMOP_USERNAME / DEMOP_PASSWORD ou pergunta no terminal)
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, getDocs, getDoc, query, where, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

/* ------------------------------------------------------------------ */
/* Dados da CI 951                                                     */
/* ------------------------------------------------------------------ */
const SEI = 'SEI-270007/049044/2026';
const CI = 'CI SEDEC/CBMERJ/GOCG Nº 951, de 14/09/2026 (SEI 141388830)';
const PDF_PADRAO = 'C:/Users/ASDFGH/.claude/uploads/0ae44a9a-75c1-4c67-8289-caaa27fd62c9/21ee3c8c-SEI_141388830_Correspondencia_Interna___NA_951.pdf';
const PDF_NOME = 'SEI_141388830_CI_951_envio_CSM.pdf';

const DORSAIS = [
  '115S2215003710', '115S2219003902', '115S2215004486', '115S2219008883',
  '115S2219098861', '115S2219003900', '115S2219008890', '115S2219010668',
  null, // 01 unidade com número de série não identificável
];
const PANE_DORSAL = 'Sistema eletrônico inoperante, mesmo após a substituição por pilhas novas';
const nomeDorsal = (sn) => (sn ? `DORSAL SCOTT (SN ${sn})` : 'DORSAL SCOTT (SN NÃO IDENTIFICADO)');

/**
 * Demais itens da CI. `qtdInop` é quantas unidades da CI ficam inoperantes no material
 * escolhido (`nome` exato ou `serie` contida na descrição). Se o material tiver menos
 * unidades que isso, as que faltam são criadas (já inoperantes).
 */
const ITENS_EXISTENTES = [
  { rotulo: '08 válvulas de demanda', nome: 'VÁLVULA DE DEMANDA DO EPRA SCOTT', qtdInop: 8, pane: 'Trava quebrada e/ou bypass inoperante' },
  { rotulo: '02 peças faciais', nome: 'PEÇA FACIAL SCOTT', qtdInop: 2, pane: 'Tirantes arrebentados, não sendo possível a utilização' },
  { rotulo: 'Motobomba Honda GCAAH-3294407', serie: '3294407', qtdInop: 1, pane: 'Vazamento no carburador e falha no sistema elétrico' },
  { rotulo: 'Motobomba Toyama TWP 80 SH10230110', serie: '10230110', qtdInop: 1, pane: 'Base danificada, impossibilitando o transporte e o manuseio seguro do equipamento' },
  { rotulo: 'Motocortador TS 420 nº 176232685', serie: '176232685', qtdInop: 1, pane: 'O equipamento liga, porém não se mantém em funcionamento, além de apresentar dificuldade para ser ligado novamente' },
];
const derivarStatus = (inop, total) => (inop <= 0 ? 'operante' : total > 0 && inop >= total ? 'inoperante' : 'parcialmente_inoperante');

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const args = process.argv.slice(2);
const flag = (nome) => args.includes(nome);
const opcao = (nome, padrao) => { const i = args.indexOf(nome); return i >= 0 && args[i + 1] ? args[i + 1] : padrao; };
const APLICAR = flag('--aplicar');
const PDF = opcao('--pdf', PDF_PADRAO);
const LOCAL_FORCADO = opcao('--local', null);

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const toDate = (v) => v?.toDate?.() || (v ? new Date(v) : null);

const promptPassword = (prompt) => new Promise((resolve) => {
  process.stdout.write(prompt);
  const stdin = process.stdin; stdin.resume(); stdin.setEncoding('utf8'); stdin.setRawMode?.(true);
  let pwd = '';
  const onData = (c) => {
    if (c === '\r' || c === '\n') { stdin.setRawMode?.(false); stdin.pause(); stdin.removeListener('data', onData); process.stdout.write('\n'); resolve(pwd); }
    else if (c === '\u0003') process.exit(1);
    else if (c === '\u0008' || c === '\u007f') { if (pwd.length) { pwd = pwd.slice(0, -1); process.stdout.write('\b \b'); } }
    else { pwd += c; process.stdout.write('*'); }
  };
  stdin.on('data', onData);
});

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

/* ------------------------------------------------------------------ */
async function main() {
  console.log(`=== CI 951 → inoperantes ${APLICAR ? '(APLICANDO)' : '(SIMULAÇÃO — nada será gravado)'} ===\n`);
  if (!firebaseConfig.apiKey) { console.error('.env sem VITE_FIREBASE_*'); process.exit(1); }
  if (!fs.existsSync(PDF)) { console.error(`PDF não encontrado: ${PDF}`); process.exit(1); }

  let username = opcao('--username', process.env.DEMOP_USERNAME);
  let password = opcao('--password', process.env.DEMOP_PASSWORD);
  if (!username) { const rl = readline.createInterface({ input, output }); username = (await rl.question('RG / username (admingeral): ')).trim(); rl.close(); }
  if (!password) password = await promptPassword('Senha: ');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const verifyLogin = httpsCallable(getFunctions(app, 'southamerica-east1'), 'verifyLogin');
  const userData = (await verifyLogin({ username, password })).data;
  if (!userData?.customToken) { console.error('Login inválido.'); process.exit(2); }
  await signInWithCustomToken(auth, userData.customToken);
  const userId = userData.userId || null;
  let userName = userData.username || username;
  try { const u = await getDoc(doc(db, 'users', userId)); if (u.exists() && u.data().full_name) userName = u.data().full_name; } catch { /* mantém username */ }
  console.log(`Autenticado como ${userName} (role=${userData.role})\n`);
  if (APLICAR && userData.role !== 'admingeral' && userData.role !== 'admin') { console.error('Precisa de admin/admingeral para gravar.'); process.exit(2); }

  /* ---------- leitura ---------- */
  const [matSnap, catSnap, locSnap, repSnap, mlSnap] = await Promise.all([
    getDocs(collection(db, 'materials')),
    getDocs(collection(db, 'categorias')),
    getDocs(collection(db, 'locais_armazenamento')),
    getDocs(query(collection(db, 'movimentacoes'), where('type', '==', 'reparo'), where('status', '==', 'emReparo'))),
    getDocs(collection(db, 'material_locais')),
  ]);
  const materials = matSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const categorias = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const locais = locSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const reparos = repSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const mls = mlSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const mlDe = (id) => mls.filter((l) => l.material_id === id && n(l.quantidade) > 0);
  console.log(`materials=${materials.length} categorias=${categorias.length} locais=${locais.length} reparos abertos=${reparos.length}\n`);

  /* ---------- local do reparo ---------- */
  const localInop = locais.find((l) => l.inoperantes) || null;
  const locaisSantos = locais.filter((l) => norm(`${l.nome} ${l.observacao || ''} ${l.tipo_label || ''}`).includes('santos'));
  const repairLocations = [...new Set(reparos.map((r) => r.repairLocation).filter(Boolean))];
  const repairSantos = repairLocations.filter((r) => norm(r).includes('santos'));
  const LOCAL_REPARO = LOCAL_FORCADO || repairSantos[0] || locaisSantos[0]?.nome || 'Depósito do Cap J Santos';
  const localArmazenamento = locaisSantos[0] || localInop || null;
  console.log('Local de reparo (texto na movimentação):', LOCAL_REPARO);
  console.log('  locais_armazenamento com "santos":', locaisSantos.map((l) => `${l.nome}${l.inoperantes ? ' [inoperantes]' : ''}`).join(' | ') || '(nenhum)');
  console.log('  local marcado como inoperantes:', localInop ? localInop.nome : '(nenhum)');
  console.log('  repairLocation já usados com "santos":', repairSantos.join(' | ') || '(nenhum)');
  console.log('  → unidades novas serão guardadas em:', localArmazenamento ? localArmazenamento.nome : '(sem local)');
  console.log();

  /* ---------- dorsais ---------- */
  const dorsaisExistentes = materials.filter((m) => norm(m.description).includes('dorsal'));
  console.log(`Dorsais já cadastradas (${dorsaisExistentes.length}):`);
  dorsaisExistentes.forEach((m) => console.log(`  - ${m.description} | cat=${m.categoria || '-'} | total=${n(m.estoque_total)} disp=${n(m.estoque_atual)} inop=${n(m.qtd_inoperante)}`));
  const modelo = dorsaisExistentes[0] || materials.find((m) => /epr|respirat|scott/i.test(m.description || ''));
  const catDorsal = modelo
    ? { categoria: modelo.categoria || '', categoria_id: modelo.categoria_id || null }
    : (() => {
      const c = categorias.find((x) => /epr|respirat|dorsal/i.test(x.description || x.name || '')) || categorias.find((x) => /epi/i.test(x.description || x.name || ''));
      return { categoria: c ? (c.description || c.name || '') : '', categoria_id: c?.id || null };
    })();
  console.log(`Categoria para as dorsais novas: ${catDorsal.categoria || '(vazia)'}\n`);

  const planoDorsais = DORSAIS.map((sn) => {
    const nome = nomeDorsal(sn);
    const jaExiste = sn ? materials.find((m) => norm(m.description).includes(norm(sn))) : materials.find((m) => norm(m.description) === norm(nome));
    return { sn, nome, jaExiste };
  });
  console.log('Dorsais da CI 951:');
  planoDorsais.forEach((p) => console.log(`  ${p.jaExiste ? 'JÁ EXISTE' : 'CRIAR    '} ${p.nome}${p.jaExiste ? ` → ${p.jaExiste.description} (inop=${n(p.jaExiste.qtd_inoperante)})` : ''}`));
  console.log();

  /* ---------- itens existentes ---------- */
  const reparosPorMaterial = new Map();
  for (const r of reparos) { if (!reparosPorMaterial.has(r.material)) reparosPorMaterial.set(r.material, []); reparosPorMaterial.get(r.material).push(r); }

  const totalDe = (m) => Math.max(n(m.estoque_total), n(m.estoque_atual) + n(m.estoque_viatura));
  const planoExistentes = ITENS_EXISTENTES.map((item) => {
    const candidatos = materials.filter((m) => (item.nome ? norm(m.description) === norm(item.nome) : String(m.description || '').replace(/\D/g, '').includes(item.serie)));
    const material = candidatos.length === 1 ? candidatos[0] : null;
    if (!material) return { item, candidatos, material: null };
    const total = totalDe(material);
    const inopAtual = n(material.qtd_inoperante);
    const delta = Math.max(0, item.qtdInop - inopAtual);
    const capacidade = Math.max(0, total - inopAtual);
    const criar = Math.max(0, delta - capacidade);
    const retirarDisp = Math.min(n(material.estoque_atual), delta - criar);
    // Unidade que estava embarcada em viatura e foi para o CSM: sai da viatura
    const retirarViatura = Math.min(n(material.estoque_viatura), delta - criar - retirarDisp);
    return { item, candidatos, material, total, inopAtual, delta, criar, retirarDisp, retirarViatura, reps: reparosPorMaterial.get(material.id) || [] };
  });
  console.log('Demais itens da CI:');
  let faltaItem = false;
  for (const p of planoExistentes) {
    console.log(`  ${p.item.rotulo}`);
    if (!p.material) { faltaItem = true; console.log(`     ⚠ ${p.candidatos.length === 0 ? 'nenhum material encontrado' : `${p.candidatos.length} materiais batem: ${p.candidatos.map((c) => c.description).join(' | ')}`}`); continue; }
    const m = p.material;
    console.log(`     ${m.description} | total=${p.total} disp=${n(m.estoque_atual)} viatura=${n(m.estoque_viatura)} inop=${p.inopAtual} | reparos abertos=${p.reps.length}${p.reps.map((r) => ` {qtd ${r.quantity}, sei "${r.seiNumber || ''}", local "${r.repairLocation || ''}", anexos ${(r.anexos || []).length}}`).join('')}`);
    console.log(`     → inoperantes ${p.inopAtual} → ${p.item.qtdInop}${p.criar ? ` (cria ${p.criar} unidade(s): total ${p.total} → ${p.total + p.criar})` : ''}${p.retirarDisp ? ` · tira ${p.retirarDisp} do disponível` : ''}${p.retirarViatura ? ` · desembarca ${p.retirarViatura} da viatura` : ''}${p.delta ? ` · ${p.delta} unidade(s) vão para ${localArmazenamento?.nome || 'sem local'} + movimentação de reparo` : ' · já inoperante, só SEI/local/PDF'}`);
  }
  console.log();

  if (!APLICAR) {
    console.log('Simulação concluída. Para gravar: node scripts/inoperantesSei951.mjs --aplicar');
    await signOut(auth); process.exit(0);
  }
  if (faltaItem) { console.error('Há item da CI sem material único correspondente. Ajuste ITENS_EXISTENTES.'); process.exit(3); }

  /* ---------- aplicar ---------- */
  const pdfBytes = new Uint8Array(fs.readFileSync(PDF));
  const anexarPdf = async (movId) => {
    const timestamp = Date.now();
    const storagePath = `reparos/${movId}/${timestamp}_${PDF_NOME}`;
    const sref = storageRef(storage, storagePath);
    await uploadBytes(sref, pdfBytes, { contentType: 'application/pdf' });
    const downloadURL = await getDownloadURL(sref);
    const anexo = {
      id: `${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      fileName: PDF_NOME,
      fileType: 'application/pdf',
      fileSize: pdfBytes.byteLength,
      storagePath,
      downloadURL,
      uploadedAt: new Date().toISOString(),
      uploadedBy: userName,
    };
    await updateDoc(doc(db, 'movimentacoes', movId), { anexos: arrayUnion(anexo) });
    return anexo;
  };
  const audit = (action, targetId, targetName, details) => addDoc(collection(db, 'audit_logs'), {
    action, userId, userName, targetCollection: 'materials', targetId, targetName, details, timestamp: serverTimestamp(),
  });
  const criarReparo = async (material, quantidade, pane) => {
    const ref = await addDoc(collection(db, 'movimentacoes'), {
      type: 'reparo',
      material: material.id,
      material_description: material.description || '',
      categoria: material.categoria || '',
      quantity: quantidade,
      date: new Date(),
      sender: userId,
      sender_name: userName,
      signed: false,
      viatura: null,
      viatura_description: null,
      observacoes: `${pane}. Encaminhado ao CSM pela ${CI}.`,
      status: 'emReparo',
      repairLocation: LOCAL_REPARO,
      seiNumber: SEI,
      motivoReparo: pane,
      origem_inoperancia: 'edicao',
    });
    return ref.id;
  };

  let criadas = 0; let anexos = 0; let movsCriadas = 0;

  // 1) Dorsais novas
  for (const p of planoDorsais) {
    if (p.jaExiste) continue;
    const dados = {
      description: p.nome,
      description_lower: p.nome.toLowerCase(),
      categoria: catDorsal.categoria,
      categoria_id: catDorsal.categoria_id,
      numero_serie: p.sn || null,
      marca: 'SCOTT',
      estoque_total: 1,
      estoque_atual: 0,
      estoque_viatura: 0,
      qtd_inoperante: 1,
      maintenance_status: 'inoperante',
      inoperante_sei: SEI,
      inoperante_motivo: PANE_DORSAL,
      inoperante_registrado_em: serverTimestamp(),
      ultima_movimentacao: serverTimestamp(),
      conferido_por: userName,
      ultima_conferencia: serverTimestamp(),
      created_by: userId,
      created_by_nome: userName,
      created_at: serverTimestamp(),
      image_url: null,
      image_storagePath: null,
    };
    const ref = await addDoc(collection(db, 'materials'), dados);
    const material = { id: ref.id, ...dados };
    criadas++;
    if (localArmazenamento) {
      await setDoc(doc(db, 'material_locais', `${ref.id}_${localArmazenamento.id}`), {
        material_id: ref.id, material_description: p.nome, categoria: catDorsal.categoria,
        local_id: localArmazenamento.id, local_nome: localArmazenamento.nome || '', local_tipo: localArmazenamento.tipo || '',
        local_tipo_label: localArmazenamento.tipo_label || '', local_numero: Number.isFinite(Number(localArmazenamento.numero)) && localArmazenamento.numero !== null ? Number(localArmazenamento.numero) : null,
        local_inoperantes: Boolean(localArmazenamento.inoperantes),
        quantidade: 1, created_at: serverTimestamp(), updated_at: serverTimestamp(), updated_by: userId, updated_by_nome: userName,
      }, { merge: true });
    }
    const movId = await criarReparo(material, 1, PANE_DORSAL); movsCriadas++;
    await anexarPdf(movId); anexos++;
    await audit('material_create', ref.id, p.nome, { categoria: catDorsal.categoria, estoque_total: 1, estoque_atual: 0, qtd_inoperante: 1, sei: SEI, motivo: PANE_DORSAL, local: localArmazenamento?.nome || null, origem: CI });
    console.log(`  criada ${p.nome} → reparo ${movId} + PDF`);
  }

  /** Leva `qtd` unidades do material para o local de reparo (tira de "sem local" e depois dos outros locais). */
  const moverParaLocal = async (material, qtd) => {
    if (!localArmazenamento || qtd <= 0) return;
    const alocs = mlDe(material.id);
    const noDestino = alocs.find((a) => a.local_id === localArmazenamento.id);
    const alocadas = alocs.reduce((s, a) => s + n(a.quantidade), 0);
    const unidadesDemop = Math.max(0, totalDe(material) - n(material.estoque_viatura));
    let restante = qtd;
    let adicionar = Math.min(Math.max(0, unidadesDemop - alocadas), restante);
    restante -= adicionar;
    for (const a of alocs.filter((x) => x.local_id !== localArmazenamento.id).sort((x, y) => n(y.quantidade) - n(x.quantidade))) {
      if (restante <= 0) break;
      const tirar = Math.min(n(a.quantidade), restante);
      if (tirar <= 0) continue;
      if (n(a.quantidade) - tirar <= 0) await deleteDoc(doc(db, 'material_locais', a.id));
      else await updateDoc(doc(db, 'material_locais', a.id), { quantidade: n(a.quantidade) - tirar, updated_at: serverTimestamp(), updated_by: userId, updated_by_nome: userName });
      adicionar += tirar; restante -= tirar;
    }
    if (adicionar <= 0) return;
    await setDoc(doc(db, 'material_locais', `${material.id}_${localArmazenamento.id}`), {
      material_id: material.id, material_description: material.description || '', categoria: material.categoria || '',
      local_id: localArmazenamento.id, local_nome: localArmazenamento.nome || '', local_tipo: localArmazenamento.tipo || '',
      local_tipo_label: localArmazenamento.tipo_label || '', local_numero: Number.isFinite(Number(localArmazenamento.numero)) && localArmazenamento.numero !== null ? Number(localArmazenamento.numero) : null,
      local_inoperantes: Boolean(localArmazenamento.inoperantes),
      quantidade: (noDestino ? n(noDestino.quantidade) : 0) + adicionar,
      updated_at: serverTimestamp(), updated_by: userId, updated_by_nome: userName, ...(noDestino ? {} : { created_at: serverTimestamp() }),
    }, { merge: true });
    await audit('material_local_move', material.id, material.description, { motivo: 'Unidades marcadas como inoperantes (CI 951)', para: localArmazenamento.nome, quantidade: adicionar });
  };

  // 2) Demais itens: marca as unidades da CI como inoperantes (criando as que faltam), SEI, local e PDF
  for (const p of planoExistentes) {
    const m = p.material;
    if (!m) continue;
    if (p.delta > 0) {
      const novoTotal = p.total + p.criar;
      if (p.retirarViatura > 0) {
        const vmSnap = await getDocs(query(collection(db, 'viatura_materiais'), where('material_id', '==', m.id), where('status', '==', 'alocado')));
        let restante = p.retirarViatura;
        for (const vmDoc of vmSnap.docs) {
          if (restante <= 0) break;
          const q = n(vmDoc.data().quantidade);
          const tirar = Math.min(q, restante);
          if (q - tirar <= 0) await updateDoc(vmDoc.ref, { status: 'desalocado', data_desalocacao: serverTimestamp(), motivo_desalocacao: `Enviado ao CSM (${CI})`, desalocado_por: userId, desalocado_por_nome: userName });
          else await updateDoc(vmDoc.ref, { quantidade: q - tirar, ultima_atualizacao: serverTimestamp() });
          restante -= tirar;
          console.log(`  ${m.description}: desembarcada(s) ${tirar} de ${vmDoc.data().viatura_prefixo || 'viatura'}`);
        }
      }
      const patch = {
        estoque_total: novoTotal,
        estoque_atual: Math.max(0, n(m.estoque_atual) - p.retirarDisp),
        estoque_viatura: Math.max(0, n(m.estoque_viatura) - p.retirarViatura),
        qtd_inoperante: p.item.qtdInop,
        maintenance_status: derivarStatus(p.item.qtdInop, novoTotal),
        inoperante_sei: SEI,
        inoperante_motivo: p.item.pane,
        inoperante_registrado_em: serverTimestamp(),
        ultima_movimentacao: serverTimestamp(),
      };
      await updateDoc(doc(db, 'materials', m.id), patch);
      await moverParaLocal({ ...m, estoque_total: novoTotal, estoque_viatura: patch.estoque_viatura }, p.delta);
      const movId = await criarReparo(m, p.delta, p.item.pane); movsCriadas++;
      await anexarPdf(movId); anexos++;
      await audit('material_update', m.id, m.description, {
        alteracoes: [
          { campo: 'qtd_inoperante', de: p.inopAtual, para: p.item.qtdInop },
          ...(p.criar ? [{ campo: 'estoque_total', de: p.total, para: novoTotal }] : []),
          ...(p.retirarDisp ? [{ campo: 'estoque_atual', de: n(m.estoque_atual), para: patch.estoque_atual }] : []),
        ],
        sei: SEI, local: LOCAL_REPARO, anexo: PDF_NOME, origem: CI,
      });
      console.log(`  ${m.description}: ${p.delta} unidade(s) inoperante(s) → reparo ${movId} + PDF${p.criar ? ` (criadas ${p.criar})` : ''}`);
    }
    // Reparos já abertos (ou o que acabou de ser criado já saiu com SEI/local): grava SEI, local e PDF nos antigos
    for (const r of p.reps) {
      const patch = { seiNumber: SEI, repairLocation: LOCAL_REPARO };
      if (!r.motivoReparo) patch.motivoReparo = p.item.pane;
      await updateDoc(doc(db, 'movimentacoes', r.id), patch);
      const jaTem = (r.anexos || []).some((a) => a.fileName === PDF_NOME);
      if (!jaTem) { await anexarPdf(r.id); anexos++; }
      console.log(`  ${m.description}: reparo ${r.id} → SEI/local gravados${jaTem ? ' (PDF já anexado)' : ' + PDF'}`);
    }
    if (p.delta <= 0) {
      if (!p.reps.length) { const movId = await criarReparo(m, p.inopAtual, p.item.pane); movsCriadas++; await anexarPdf(movId); anexos++; console.log(`  ${m.description}: sem reparo aberto → criada movimentação ${movId} + PDF`); }
      const patchMat = { inoperante_sei: SEI };
      if (!m.inoperante_motivo) patchMat.inoperante_motivo = p.item.pane;
      if (!m.inoperante_registrado_em) patchMat.inoperante_registrado_em = serverTimestamp();
      await updateDoc(doc(db, 'materials', m.id), patchMat);
      await audit('material_update', m.id, m.description, { alteracoes: [{ campo: 'anexo_reparo', de: null, para: PDF_NOME }], sei: SEI, local: LOCAL_REPARO, origem: CI });
    }
  }

  // 3) Dorsal genérica: a unidade que já constava inoperante passa a ser uma das dorsais com série
  const genericaDorsal = dorsaisExistentes.find((m) => norm(m.description) === 'dorsal scott');
  if (genericaDorsal && n(genericaDorsal.qtd_inoperante) > 0) {
    const inop = n(genericaDorsal.qtd_inoperante);
    const total = totalDe(genericaDorsal);
    await updateDoc(doc(db, 'materials', genericaDorsal.id), {
      qtd_inoperante: 0, maintenance_status: 'operante', estoque_total: Math.max(n(genericaDorsal.estoque_atual) + n(genericaDorsal.estoque_viatura), total - inop),
      ultima_movimentacao: serverTimestamp(),
    });
    for (const r of reparosPorMaterial.get(genericaDorsal.id) || []) {
      await updateDoc(doc(db, 'movimentacoes', r.id), { status: 'devolvidaDeReparo', returned_date: serverTimestamp(), devolvido_por: userId, devolvido_por_nome: userName, observacoes_devolucao: `Reclassificada: passou a ser cadastrada por número de série (${CI})` });
    }
    for (const a of mlDe(genericaDorsal.id).filter((x) => x.local_inoperantes)) {
      const nova = n(a.quantidade) - inop;
      if (nova <= 0) await deleteDoc(doc(db, 'material_locais', a.id)); else await updateDoc(doc(db, 'material_locais', a.id), { quantidade: nova, updated_at: serverTimestamp() });
    }
    await audit('material_update', genericaDorsal.id, genericaDorsal.description, { alteracoes: [{ campo: 'qtd_inoperante', de: inop, para: 0 }, { campo: 'estoque_total', de: total, para: total - inop }], motivo: 'Unidade inoperante reclassificada como dorsal com número de série', origem: CI });
    console.log(`  ${genericaDorsal.description}: ${inop} unidade(s) inoperante(s) reclassificada(s) (total ${total} → ${total - inop})`);
  }

  console.log(`\nConcluído: ${criadas} dorsais criadas, ${movsCriadas} movimentações de reparo criadas, ${anexos} PDFs anexados.`);
  await signOut(auth);
  process.exit(0);
}

main().catch((e) => { console.error('ERRO:', e?.message || e); process.exit(1); });
