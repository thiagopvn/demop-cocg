// Troca as conclusões registradas só como "[CONFORME PREVISTO]" por um detalhe do que foi
// executado, gerado a partir do que estava previsto (mesma regra da tela: gerarDetalheConclusao).
// Atualiza `historico_manutencoes` e as `manutencoes` concluídas. Registros com texto
// próprio (ex.: "material se encontra no CSM") não são tocados.
//
// Uso: node scripts/detalharConclusoes.mjs [--aplicar]   (login: DEMOP_USERNAME / DEMOP_PASSWORD)
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, getDocs, addDoc, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { gerarDetalheConclusao, montarNotasConclusao, notasSemDetalhe } from '../src/utils/maintenanceNotes.js';

const APLICAR = process.argv.includes('--aplicar');
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY, authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: process.env.VITE_FIREBASE_APP_ID,
};

async function main() {
  const username = process.env.DEMOP_USERNAME; const password = process.env.DEMOP_PASSWORD;
  if (!username || !password) { console.error('Informe DEMOP_USERNAME/DEMOP_PASSWORD'); process.exit(1); }
  const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app);
  const u = (await httpsCallable(getFunctions(app, 'southamerica-east1'), 'verifyLogin')({ username, password })).data;
  if (!u?.customToken) { console.error('Login inválido.'); process.exit(2); }
  await signInWithCustomToken(auth, u.customToken);

  const [hist, man] = await Promise.all([getDocs(collection(db, 'historico_manutencoes')), getDocs(collection(db, 'manutencoes'))]);
  const alvosHist = hist.docs.filter((d) => notasSemDetalhe(d.data().completionNotes));
  const alvosMan = man.docs.filter((d) => d.data().status === 'concluida' && notasSemDetalhe(d.data().completionNotes));
  console.log(`${APLICAR ? 'APLICANDO' : 'SIMULAÇÃO'} · histórico: ${alvosHist.length} de ${hist.size} só com o marcador · manutenções concluídas: ${alvosMan.length} de ${man.size}`);
  for (const d of alvosHist.slice(0, 8)) { const x = d.data(); console.log(`  ${x.materialDescription} | ${x.description}\n     → ${montarNotasConclusao({ conformePrevisto: true, texto: gerarDetalheConclusao(x) })}`); }
  if (!APLICAR) { await signOut(auth); process.exit(0); }

  let gravados = 0;
  const lotes = [...alvosHist.map((d) => ['historico_manutencoes', d]), ...alvosMan.map((d) => ['manutencoes', d])];
  for (let i = 0; i < lotes.length; i += 400) {
    const batch = writeBatch(db);
    for (const [col, d] of lotes.slice(i, i + 400)) {
      batch.update(doc(db, col, d.id), { completionNotes: montarNotasConclusao({ conformePrevisto: true, texto: gerarDetalheConclusao(d.data()) }), completionNotesDetalhadaEm: serverTimestamp() });
      gravados++;
    }
    await batch.commit();
  }
  await addDoc(collection(db, 'audit_logs'), { action: 'manutencao_complete', userId: u.userId, userName: u.username, targetCollection: 'historico_manutencoes', targetId: null, targetName: `${gravados} registros`, details: { o_que_foi_feito: 'Detalhamento automático das conclusões registradas apenas como "conforme previsto"', historico: alvosHist.length, manutencoes: alvosMan.length }, timestamp: serverTimestamp() });
  console.log(`Concluído: ${gravados} registros detalhados.`);
  await signOut(auth); process.exit(0);
}
main().catch((e) => { console.error('ERRO:', e?.message || e); process.exit(1); });
