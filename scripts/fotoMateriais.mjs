// Grava a mesma foto em todos os materiais cuja descrição casa com um padrão.
// Só materiais SEM foto recebem a imagem (use --sobrescrever para trocar as existentes).
//
// Uso: node scripts/fotoMateriais.mjs --foto <arquivo.jpg> --padrao "^CILINDRO SCOTT" [--aplicar] [--sobrescrever]
//      (login: DEMOP_USERNAME / DEMOP_PASSWORD ou --username/--password)
import 'dotenv/config';
import fs from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const args = process.argv.slice(2);
const opcao = (nome, padrao) => { const i = args.indexOf(nome); return i >= 0 && args[i + 1] ? args[i + 1] : padrao; };
const APLICAR = args.includes('--aplicar');
const SOBRESCREVER = args.includes('--sobrescrever');
const FOTO = opcao('--foto', null);
const PADRAO = new RegExp(opcao('--padrao', '^$'), 'i');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY, authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN, projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: process.env.VITE_FIREBASE_APP_ID,
};

async function main() {
  if (!FOTO || !fs.existsSync(FOTO)) { console.error('Informe --foto <arquivo>'); process.exit(1); }
  const username = opcao('--username', process.env.DEMOP_USERNAME);
  const password = opcao('--password', process.env.DEMOP_PASSWORD);
  if (!username || !password) { console.error('Informe DEMOP_USERNAME/DEMOP_PASSWORD'); process.exit(1); }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app); const db = getFirestore(app); const storage = getStorage(app);
  const u = (await httpsCallable(getFunctions(app, 'southamerica-east1'), 'verifyLogin')({ username, password })).data;
  if (!u?.customToken) { console.error('Login inválido.'); process.exit(2); }
  await signInWithCustomToken(auth, u.customToken);
  const userId = u.userId; const userName = u.username || username;

  const materials = (await getDocs(collection(db, 'materials'))).docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => PADRAO.test(m.description || ''));
  const alvo = materials.filter((m) => SOBRESCREVER || !m.image_url);
  console.log(`${APLICAR ? 'APLICANDO' : 'SIMULAÇÃO'} · ${materials.length} materiais casam com o padrão · ${alvo.length} receberão a foto${SOBRESCREVER ? ' (sobrescrevendo)' : ' (só os sem foto)'}`);
  alvo.forEach((m) => console.log(`  ${m.description}${m.image_url ? ' (tem foto)' : ''}`));
  if (!APLICAR) { await signOut(auth); process.exit(0); }

  const bytes = new Uint8Array(fs.readFileSync(FOTO));
  let feitos = 0;
  for (const m of alvo) {
    const storagePath = `materials/${m.id}/${Date.now()}.jpg`;
    const sref = storageRef(storage, storagePath);
    await uploadBytes(sref, bytes, { contentType: 'image/jpeg' });
    const downloadURL = await getDownloadURL(sref);
    if (m.image_storagePath) { try { await deleteObject(storageRef(storage, m.image_storagePath)); } catch { /* já não existia */ } }
    await updateDoc(doc(db, 'materials', m.id), { image_url: downloadURL, image_storagePath: storagePath });
    await addDoc(collection(db, 'audit_logs'), { action: 'material_update', userId, userName, targetCollection: 'materials', targetId: m.id, targetName: m.description, details: { alteracoes: [{ campo: 'image', de: m.image_url ? 'foto anterior' : 'sem foto', para: 'nova foto' }], origem: 'script fotoMateriais' }, timestamp: serverTimestamp() });
    feitos++;
    console.log(`  ✓ ${m.description}`);
  }
  console.log(`Concluído: ${feitos} fotos gravadas.`);
  await signOut(auth); process.exit(0);
}
main().catch((e) => { console.error('ERRO:', e?.message || e); process.exit(1); });
