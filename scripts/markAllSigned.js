// Standalone Node script: marca signed=true em todas as movimentações
// existentes na coleção 'movimentacoes' que não tenham signed===true.
// Uso: node scripts/markAllSigned.js
//
// Autenticação: usa o mesmo fluxo do uploadBensPatrimoniais.js — Firebase Web
// SDK + Cloud Function verifyLogin. O usuário precisa ter role admin,
// admingeral ou BensPatrimoniais (ver firestore.rules → movimentacoes).
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

async function main() {
  console.log('=== Marcar movimentações como signed=true ===\n');

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

  try {
    const tokenResult = await auth.currentUser.getIdTokenResult();
    const role = tokenResult.claims?.role;
    console.log(`Role do usuário: ${role || '(sem custom claim)'}`);
    if (!['admin', 'admingeral', 'BensPatrimoniais'].includes(role)) {
      console.error('ERRO: a role atual não permite update em movimentacoes (precisa de admin/admingeral/BensPatrimoniais).');
      process.exit(3);
    }
  } catch (err) {
    console.warn('Não foi possível ler custom claims:', err.message);
  }

  console.log('\nLendo coleção movimentacoes...');
  const colRef = collection(db, 'movimentacoes');
  const snap = await getDocs(colRef);
  console.log(`Total de documentos: ${snap.size}`);

  const targets = [];
  snap.forEach((d) => {
    const data = d.data();
    if (data?.signed !== true) targets.push(d.id);
  });
  console.log(`Documentos com signed != true: ${targets.length}`);

  if (targets.length === 0) {
    console.log('Nada a atualizar. Encerrando.');
    await signOut(auth);
    process.exit(0);
  }

  const BATCH_LIMIT = 400;
  let batch = writeBatch(db);
  let ops = 0;
  let updated = 0;
  const errors = [];

  const commit = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  };

  console.log('\nAplicando updates em batches...');
  for (const id of targets) {
    try {
      batch.update(doc(db, 'movimentacoes', id), {
        signed: true,
        signed_date: serverTimestamp(),
      });
      ops += 1;
      updated += 1;
      if (ops >= BATCH_LIMIT) {
        await commit();
        console.log(`  ${updated}/${targets.length} atualizados...`);
      }
    } catch (err) {
      errors.push({ id, message: err?.message || String(err) });
    }
  }
  await commit();

  console.log('\n=== Resultado ===');
  console.log(`Atualizados: ${updated}`);
  console.log(`Erros:       ${errors.length}`);
  if (errors.length) {
    console.log('\nPrimeiros 5 erros:');
    errors.slice(0, 5).forEach((e, i) => {
      console.log(`  ${i + 1}. doc ${e.id}: ${e.message}`);
    });
  }

  await signOut(auth);
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(99);
});
