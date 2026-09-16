// Cilindros SCOTT: troca os cadastros genéricos "CILINDRO SCOTT" por um material por
// número de série ("CILINDRO SCOTT - IL 1088075"), já alocado na viatura certa ou guardado
// no local "GAIOLA DO COMPRESSOR" (criado se não existir). Mantém apenas UM genérico:
// o cilindro do AT da Cidade do Samba (sem número de série conhecido).
//
// Uso:
//   node scripts/cilindrosScott.mjs                    -> SIMULAÇÃO (só lê e imprime o plano)
//   node scripts/cilindrosScott.mjs --aplicar          -> grava
//   opções: --manter <idDoMaterialGenericoQueFica>  (obrigatório se a simulação não achar sozinho)
//           --username <rg> --password <senha>      (ou DEMOP_USERNAME / DEMOP_PASSWORD, ou pergunta)
import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, getDocs, getDoc, query, where, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

/* ------------------------------------------------------------------ */
/* Dados                                                               */
/* ------------------------------------------------------------------ */
const DESTINOS = [
  { tipo: 'viatura', prefixo: 'ABT 110', series: ['IL 1088075', 'IL 1098437', 'IL 1088124', 'IL 1079155', 'IL 1088096', 'IL 1079260', 'IL 1086777', 'IL 1082855', 'IL 1098977', 'IL 1089011'] },
  { tipo: 'viatura', prefixo: 'AR 594', series: ['IL 1088933', 'IL 1088358'] },
  { tipo: 'viatura', prefixo: 'AT 084', series: ['IL 1086776', 'IL 1088154'] },
  { tipo: 'viatura', prefixo: 'ABS 107', series: ['IL 1088934', 'IL 1086464', 'IL 1086097', 'IL 1088113', 'IL 1086365', 'IL 1098815', 'IL 1088400', 'IL 1088802', 'IL 1084008'] },
  { tipo: 'viatura', prefixo: 'ABSL 168', series: ['IL 1088153', 'IL 1088122', 'IL 1088594', 'IL 1083760'] },
  { tipo: 'local', nome: 'GAIOLA DO COMPRESSOR', series: ['IL 1107515', 'IL 1086530', 'IL 1088930', 'IL 1083769', 'IL 1088903', 'IL 1088615', 'IL 1086336', 'IL 1088643', 'IL 1079543'] },
];
const NOME = (sn) => `CILINDRO SCOTT - ${sn}`;
const NOME_MANTIDO = 'CILINDRO SCOTT - SN NÃO IDENTIFICADO (AT CIDADE DO SAMBA)';
const LOCAL_GAIOLA = { tipo: 'gaiola_do_compressor', tipo_label: 'GAIOLA DO COMPRESSOR', nome: 'GAIOLA DO COMPRESSOR', observacao: 'Cilindros de ar SCOTT junto ao compressor fixo' };

/* ------------------------------------------------------------------ */
const args = process.argv.slice(2);
const flag = (nome) => args.includes(nome);
const opcao = (nome, padrao) => { const i = args.indexOf(nome); return i >= 0 && args[i + 1] ? args[i + 1] : padrao; };
const APLICAR = flag('--aplicar');
const MANTER = opcao('--manter', null);

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const digitos = (s) => String(s ?? '').replace(/\D/g, '');
const letras = (s) => norm(s).replace(/[^a-z]/g, '');

const promptPassword = (prompt) => new Promise((resolve) => {
  process.stdout.write(prompt);
  const stdin = process.stdin; stdin.resume(); stdin.setEncoding('utf8'); stdin.setRawMode?.(true);
  let pwd = '';
  const onData = (c) => {
    if (c === '\r' || c === '\n') { stdin.setRawMode?.(false); stdin.pause(); stdin.removeListener('data', onData); process.stdout.write('\n'); resolve(pwd); }
    else if (c === '') process.exit(1);
    else if (c === '' || c === '') { if (pwd.length) { pwd = pwd.slice(0, -1); process.stdout.write('\b \b'); } }
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

/** Acha a viatura pelo prefixo "ABT 110": mesmos dígitos e, se houver letras, mesmas letras. */
function acharViatura(viaturas, prefixo) {
  const dig = digitos(prefixo);
  const let_ = letras(prefixo);
  const porDigitos = viaturas.filter((v) => digitos(v.prefixo) === dig);
  const exatas = porDigitos.filter((v) => letras(v.prefixo) === let_);
  if (exatas.length === 1) return { viatura: exatas[0], candidatos: porDigitos };
  if (porDigitos.length === 1) return { viatura: porDigitos[0], candidatos: porDigitos };
  const porTexto = viaturas.filter((v) => norm(`${v.prefixo} ${v.description || ''}`).includes(norm(prefixo)));
  if (porTexto.length === 1) return { viatura: porTexto[0], candidatos: porTexto };
  return { viatura: null, candidatos: [...new Set([...porDigitos, ...porTexto])] };
}

async function main() {
  console.log(`=== Cilindros SCOTT ${APLICAR ? '(APLICANDO)' : '(SIMULAÇÃO — nada será gravado)'} ===\n`);
  if (!firebaseConfig.apiKey) { console.error('.env sem VITE_FIREBASE_*'); process.exit(1); }

  let username = opcao('--username', process.env.DEMOP_USERNAME);
  let password = opcao('--password', process.env.DEMOP_PASSWORD);
  if (!username) { const rl = readline.createInterface({ input, output }); username = (await rl.question('RG / username (admingeral): ')).trim(); rl.close(); }
  if (!password) password = await promptPassword('Senha: ');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
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
  const [matSnap, vtrSnap, vmSnap, mlSnap, locSnap] = await Promise.all([
    getDocs(collection(db, 'materials')),
    getDocs(collection(db, 'viaturas')),
    getDocs(query(collection(db, 'viatura_materiais'), where('status', '==', 'alocado'))),
    getDocs(collection(db, 'material_locais')),
    getDocs(collection(db, 'locais_armazenamento')),
  ]);
  const materials = matSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const viaturas = vtrSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const vms = vmSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const mls = mlSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const locais = locSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const cilindros = materials.filter((m) => { const t = norm(m.description); return t.includes('cilindro') && t.includes('scott'); });
  const genericos = cilindros.filter((m) => !/\d{6,}/.test(m.description || ''));
  const serializados = cilindros.filter((m) => /\d{6,}/.test(m.description || ''));
  const vmDe = (id) => vms.filter((v) => v.material_id === id);
  const mlDe = (id) => mls.filter((l) => l.material_id === id);

  console.log(`Cilindros SCOTT encontrados: ${cilindros.length} (${genericos.length} genéricos, ${serializados.length} com número de série)\n`);
  console.log('Genéricos:');
  for (const m of genericos) {
    console.log(`  [${m.id}] ${m.description} | total=${n(m.estoque_total)} disp=${n(m.estoque_atual)} viatura=${n(m.estoque_viatura)} inop=${n(m.qtd_inoperante)}`);
    for (const v of vmDe(m.id)) console.log(`      em viatura: ${v.viatura_prefixo || '?'} ${v.viatura_description || ''} ×${n(v.quantidade)}`);
    for (const l of mlDe(m.id)) console.log(`      em local:   ${l.local_nome} ×${n(l.quantidade)}`);
  }
  if (serializados.length) { console.log('\nJá com número de série (serão mantidos como estão):'); serializados.forEach((m) => console.log(`  ${m.description}`)); }

  /* ---------- cautelas/reparos abertos dos genéricos (bloqueiam exclusão) ---------- */
  const bloqueios = new Map();
  for (const m of genericos) {
    const [caut, rep] = await Promise.all([
      getDocs(query(collection(db, 'movimentacoes'), where('material', '==', m.id), where('type', '==', 'cautela'), where('status', '==', 'cautelado'))),
      getDocs(query(collection(db, 'movimentacoes'), where('material', '==', m.id), where('type', '==', 'reparo'), where('status', '==', 'emReparo'))),
    ]);
    if (caut.size || rep.size) bloqueios.set(m.id, { cautelas: caut.size, reparos: rep.size });
  }

  /* ---------- qual genérico fica (AT Cidade do Samba) ---------- */
  const vtrSamba = viaturas.filter((v) => norm(`${v.prefixo} ${v.description || ''}`).includes('samba'));
  const candidatosManter = genericos.filter((m) => vmDe(m.id).some((v) => vtrSamba.some((s) => s.id === v.viatura_id)));
  let mantido = MANTER ? genericos.find((m) => m.id === MANTER) : (candidatosManter.length === 1 ? candidatosManter[0] : null);
  console.log('\nViatura(s) "Cidade do Samba":', vtrSamba.map((v) => `${v.prefixo} ${v.description || ''} [${v.id}]`).join(' | ') || '(nenhuma encontrada)');
  console.log('Genérico que FICA (AT Cidade do Samba):', mantido ? `${mantido.description} [${mantido.id}]` : '(não identificado — use --manter <id>)');
  const vmSambaDoMantido = mantido ? vmDe(mantido.id).find((v) => vtrSamba.some((s) => s.id === v.viatura_id)) : null;

  /* ---------- destinos ---------- */
  console.log('\nDestinos:');
  const plano = [];
  let faltaViatura = false;
  for (const d of DESTINOS) {
    if (d.tipo === 'viatura') {
      const { viatura, candidatos } = acharViatura(viaturas, d.prefixo);
      if (!viatura) faltaViatura = true;
      console.log(`  ${d.prefixo} → ${viatura ? `${viatura.prefixo} ${viatura.description || ''} [${viatura.id}]` : `NÃO ENCONTRADA (candidatas: ${candidatos.map((c) => c.prefixo).join(', ') || 'nenhuma'})`} · ${d.series.length} cilindros`);
      plano.push({ ...d, viatura });
    } else {
      const local = locais.find((l) => (l.nome_lower || norm(l.nome)) === norm(d.nome));
      console.log(`  ${d.nome} → ${local ? `local existente [${local.id}]` : 'será CRIADO'} · ${d.series.length} cilindros`);
      plano.push({ ...d, local });
    }
  }
  // Cilindros já cadastrados por série: ganham o nome no padrão novo e, se estiverem na lista, o destino certo
  const serieDe = (m) => { const d = (String(m.description || '').match(/\d{6,}/) || [])[0]; return d ? `IL ${d}` : null; };
  const existentePorSerie = new Map(serializados.map((m) => [digitos(serieDe(m) || ''), m]));
  const jaExistem = DESTINOS.flatMap((d) => d.series).filter((sn) => existentePorSerie.has(digitos(sn)));
  console.log(`\nCilindros já cadastrados por série (${serializados.length}) — serão renomeados para o padrão:`);
  for (const m of serializados) {
    const sn = serieDe(m);
    const destino = DESTINOS.find((d) => d.series.some((s) => digitos(s) === digitos(sn || '')));
    console.log(`  ${m.description} → ${sn ? NOME(sn) : '(sem série legível, fica como está)'}${destino ? ` · destino: ${destino.prefixo || destino.nome}` : ''} | disp=${n(m.estoque_atual)} viatura=${n(m.estoque_viatura)}${vmDe(m.id).map((v) => ` [em ${v.viatura_prefixo}]`).join('')}${mlDe(m.id).map((l) => ` [em ${l.local_nome}]`).join('')}`);
  }
  if (mantido) {
    const [caut, rep] = await Promise.all([
      getDocs(query(collection(db, 'movimentacoes'), where('material', '==', mantido.id), where('type', '==', 'cautela'), where('status', '==', 'cautelado'))),
      getDocs(query(collection(db, 'movimentacoes'), where('material', '==', mantido.id), where('type', '==', 'reparo'), where('status', '==', 'emReparo'))),
    ]);
    console.log(`\nGenérico mantido: ${caut.size} cautela(s) aberta(s) (continuam abertas, apontando para o genérico) e ${rep.size} reparo(s) aberto(s) (serão encerrados; os ${n(mantido.qtd_inoperante)} inoperantes deixam de existir no genérico).`);
    mantido._reparosAbertos = rep.docs.map((d) => d.id);
  }

  const excluir = genericos.filter((m) => m.id !== mantido?.id);
  console.log(`\nSerão EXCLUÍDOS ${excluir.length} genéricos:`);
  for (const m of excluir) console.log(`  ${m.description} [${m.id}]${bloqueios.has(m.id) ? `  ⚠ BLOQUEADO: ${bloqueios.get(m.id).cautelas} cautela(s) e ${bloqueios.get(m.id).reparos} reparo(s) abertos` : ''}`);
  if (mantido) console.log(`\nO mantido será renomeado para "${NOME_MANTIDO}" com total 1, 1 em viatura (${vmSambaDoMantido ? vmSambaDoMantido.viatura_prefixo : 'sem linha de viatura!'}), 0 disponível; outras alocações dele em viaturas/locais serão removidas.`);
  console.log();

  if (!APLICAR) { console.log('Simulação concluída. Para gravar: node scripts/cilindrosScott.mjs --aplicar' + (mantido ? '' : ' --manter <id>')); await signOut(auth); process.exit(0); }
  if (!mantido) { console.error('Não sei qual genérico manter. Rode com --manter <id>.'); process.exit(3); }
  if (faltaViatura) { console.error('Há viatura não encontrada. Corrija o prefixo no script ou cadastre a viatura.'); process.exit(3); }
  const bloqueados = excluir.filter((m) => bloqueios.has(m.id));
  if (bloqueados.length) { console.error('Há genéricos com cautela/reparo aberto. Devolva/encerre antes de excluir:', bloqueados.map((m) => m.description).join(', ')); process.exit(3); }

  /* ---------- aplicar ---------- */
  const audit = (action, targetCollection, targetId, targetName, details) => addDoc(collection(db, 'audit_logs'), { action, userId, userName, targetCollection, targetId, targetName, details, timestamp: serverTimestamp() });
  const categoria = mantido.categoria || genericos[0]?.categoria || '';
  const categoria_id = mantido.categoria_id || genericos[0]?.categoria_id || null;

  // 1) Local GAIOLA DO COMPRESSOR
  let localGaiola = plano.find((d) => d.tipo === 'local').local;
  if (!localGaiola) {
    const docLocal = { ...LOCAL_GAIOLA, numero: null, nome_lower: norm(LOCAL_GAIOLA.nome), inoperantes: false, ativo: true, created_at: serverTimestamp(), created_by: userId, created_by_nome: userName, updated_at: serverTimestamp() };
    const ref = await addDoc(collection(db, 'locais_armazenamento'), docLocal);
    localGaiola = { id: ref.id, ...docLocal };
    await audit('local_create', 'locais_armazenamento', ref.id, LOCAL_GAIOLA.nome, { locais: [LOCAL_GAIOLA.nome], origem: 'script cilindrosScott' });
    console.log(`Local criado: ${LOCAL_GAIOLA.nome} [${ref.id}]`);
  }

  // 1b) Cilindros já cadastrados por série: nome no padrão + destino (quando constam na lista)
  for (const m of serializados) {
    const sn = serieDe(m);
    if (!sn) continue;
    const nome = NOME(sn);
    const destino = plano.find((d) => d.series.some((s) => digitos(s) === digitos(sn)));
    const patch = { description: nome, description_lower: nome.toLowerCase(), numero_serie: sn, marca: 'SCOTT', ultima_movimentacao: serverTimestamp() };
    if (destino) {
      // remove alocações antigas em viatura/local e coloca no destino
      for (const v of vmDe(m.id)) if (!(destino.tipo === 'viatura' && v.viatura_id === destino.viatura.id)) await deleteDoc(doc(db, 'viatura_materiais', v.id));
      for (const l of mlDe(m.id)) if (!(destino.tipo === 'local' && l.local_id === localGaiola.id)) await deleteDoc(doc(db, 'material_locais', l.id));
      const total = Math.max(1, n(m.estoque_total), n(m.estoque_atual) + n(m.estoque_viatura));
      if (destino.tipo === 'viatura') {
        const jaNaViatura = vmDe(m.id).some((v) => v.viatura_id === destino.viatura.id);
        if (!jaNaViatura) await addDoc(collection(db, 'viatura_materiais'), { viatura_id: destino.viatura.id, viatura_prefixo: destino.viatura.prefixo || '', viatura_description: destino.viatura.description || '', material_id: m.id, material_description: nome, categoria: m.categoria || categoria, quantidade: 1, data_alocacao: serverTimestamp(), alocado_por: userId, alocado_por_nome: userName, status: 'alocado' });
        Object.assign(patch, { estoque_total: total, estoque_viatura: 1, estoque_atual: Math.max(0, total - 1) });
      } else {
        await setDoc(doc(db, 'material_locais', `${m.id}_${localGaiola.id}`), { material_id: m.id, material_description: nome, categoria: m.categoria || categoria, local_id: localGaiola.id, local_nome: localGaiola.nome, local_tipo: localGaiola.tipo || '', local_tipo_label: localGaiola.tipo_label || '', local_numero: null, local_inoperantes: false, quantidade: 1, created_at: serverTimestamp(), updated_at: serverTimestamp(), updated_by: userId, updated_by_nome: userName }, { merge: true });
        Object.assign(patch, { estoque_total: total, estoque_viatura: 0, estoque_atual: total });
      }
    }
    await updateDoc(doc(db, 'materials', m.id), patch);
    for (const v of vmDe(m.id)) if (destino?.tipo === 'viatura' && v.viatura_id === destino.viatura.id) await updateDoc(doc(db, 'viatura_materiais', v.id), { material_description: nome });
    await audit('material_update', 'materials', m.id, nome, { alteracoes: [{ campo: 'description', de: m.description, para: nome }], destino: destino ? (destino.prefixo || destino.nome) : null, origem: 'script cilindrosScott' });
    console.log(`  renomeado ${m.description} → ${nome}${destino ? ` (${destino.prefixo || destino.nome})` : ''}`);
  }

  // 2) Cilindros por número de série
  let criados = 0;
  for (const d of plano) {
    for (const sn of d.series) {
      if (jaExistem.includes(sn)) { console.log(`  já existia (só renomeado/realocado): ${sn}`); continue; }
      const nome = NOME(sn);
      const emViatura = d.tipo === 'viatura';
      const dados = {
        description: nome, description_lower: nome.toLowerCase(), categoria, categoria_id,
        numero_serie: sn, marca: 'SCOTT',
        estoque_total: 1, estoque_atual: emViatura ? 0 : 1, estoque_viatura: emViatura ? 1 : 0,
        qtd_inoperante: 0, maintenance_status: 'operante',
        ultima_movimentacao: serverTimestamp(), conferido_por: userName, ultima_conferencia: serverTimestamp(),
        created_by: userId, created_by_nome: userName, created_at: serverTimestamp(), image_url: null, image_storagePath: null,
      };
      const ref = await addDoc(collection(db, 'materials'), dados);
      criados++;
      if (emViatura) {
        await addDoc(collection(db, 'viatura_materiais'), {
          viatura_id: d.viatura.id, viatura_prefixo: d.viatura.prefixo || '', viatura_description: d.viatura.description || '',
          material_id: ref.id, material_description: nome, categoria, quantidade: 1,
          data_alocacao: serverTimestamp(), alocado_por: userId, alocado_por_nome: userName, status: 'alocado',
        });
        await audit('material_allocate', 'viatura_materiais', ref.id, nome, { material: nome, materialId: ref.id, viatura: `${d.viatura.prefixo} - ${d.viatura.description || ''}`, viaturaId: d.viatura.id, quantidade: 1 });
      } else {
        await setDoc(doc(db, 'material_locais', `${ref.id}_${localGaiola.id}`), {
          material_id: ref.id, material_description: nome, categoria,
          local_id: localGaiola.id, local_nome: localGaiola.nome, local_tipo: localGaiola.tipo || '', local_tipo_label: localGaiola.tipo_label || '', local_numero: null, local_inoperantes: false,
          quantidade: 1, created_at: serverTimestamp(), updated_at: serverTimestamp(), updated_by: userId, updated_by_nome: userName,
        });
        await audit('material_local_set', 'material_locais', ref.id, nome, { local: localGaiola.nome, quantidade: 1 });
      }
      await audit('material_create', 'materials', ref.id, nome, { categoria, estoque_total: 1, estoque_atual: dados.estoque_atual, destino: emViatura ? d.viatura.prefixo : localGaiola.nome, origem: 'script cilindrosScott' });
      console.log(`  criado ${nome} → ${emViatura ? d.viatura.prefixo : localGaiola.nome}`);
    }
  }
  for (const d of plano) if (d.tipo === 'viatura') await updateDoc(doc(db, 'viaturas', d.viatura.id), { ultima_movimentacao: serverTimestamp() });

  // 3) Genérico mantido: nome, quantidades e só a linha da viatura do Samba
  for (const v of vmDe(mantido.id)) {
    if (vmSambaDoMantido && v.id === vmSambaDoMantido.id) { if (n(v.quantidade) !== 1) await updateDoc(doc(db, 'viatura_materiais', v.id), { quantidade: 1, ultima_atualizacao: serverTimestamp(), atualizado_por: userId, atualizado_por_nome: userName }); }
    else await deleteDoc(doc(db, 'viatura_materiais', v.id));
  }
  for (const l of mlDe(mantido.id)) await deleteDoc(doc(db, 'material_locais', l.id));
  await updateDoc(doc(db, 'materials', mantido.id), {
    description: NOME_MANTIDO, description_lower: NOME_MANTIDO.toLowerCase(),
    estoque_total: 1, estoque_viatura: vmSambaDoMantido ? 1 : 0, estoque_atual: vmSambaDoMantido ? 0 : 1,
    qtd_inoperante: 0, maintenance_status: 'operante',
    ultima_movimentacao: serverTimestamp(), conferido_por: userName, ultima_conferencia: serverTimestamp(),
  });
  if (vmSambaDoMantido) await updateDoc(doc(db, 'viatura_materiais', vmSambaDoMantido.id), { material_description: NOME_MANTIDO });
  for (const repId of mantido._reparosAbertos || []) {
    await updateDoc(doc(db, 'movimentacoes', repId), { status: 'devolvidaDeReparo', returned_date: serverTimestamp(), devolvido_por: userId, devolvido_por_nome: userName, observacoes_devolucao: 'Encerrado: cilindros passaram a ser cadastrados por número de série' });
  }
  await audit('material_update', 'materials', mantido.id, NOME_MANTIDO, { alteracoes: [{ campo: 'description', de: mantido.description, para: NOME_MANTIDO }, { campo: 'estoque_total', de: n(mantido.estoque_total), para: 1 }], origem: 'script cilindrosScott' });
  console.log(`  mantido e ajustado: ${NOME_MANTIDO}`);

  // 4) Excluir os demais genéricos (mesma limpeza do botão Excluir da tela de Material)
  for (const m of excluir) {
    for (const v of vmDe(m.id)) await deleteDoc(doc(db, 'viatura_materiais', v.id));
    for (const l of mlDe(m.id)) await deleteDoc(doc(db, 'material_locais', l.id));
    const maint = await getDocs(query(collection(db, 'manutencoes'), where('materialId', '==', m.id), where('status', 'in', ['pendente', 'em_andamento'])));
    for (const md of maint.docs) await deleteDoc(md.ref);
    await deleteDoc(doc(db, 'materials', m.id));
    await audit('material_delete', 'materials', m.id, m.description, { motivo: 'Substituído por cilindros cadastrados por número de série', estoque_total: n(m.estoque_total), origem: 'script cilindrosScott' });
    console.log(`  excluído ${m.description}`);
  }

  console.log(`\nConcluído: ${criados} cilindros criados, ${excluir.length} genéricos excluídos, 1 mantido.`);
  await signOut(auth);
  process.exit(0);
}

main().catch((e) => { console.error('ERRO:', e?.message || e); process.exit(1); });
