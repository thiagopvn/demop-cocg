// ============================================================
// Chat interno, avisos, transferência de cautela, presença e push
// (carregado por index.js — o app admin já está inicializado lá)
// ============================================================
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

const REGION = "southamerica-east1";
const db = getFirestore();

const idPar = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
const meuId = (request) => request.auth?.token?.firestoreId || request.auth?.uid;

function exigirAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  return meuId(request);
}

async function nomeDe(uid) {
  const snap = await db.collection("users").doc(uid).get();
  const d = snap.exists ? snap.data() : {};
  return { nome: d.full_name || d.username || "Militar", username: d.username || "", rg: d.rg || "", telefone: d.telefone || "", foto: d.foto_url || null, role: d.role || "user" };
}

const PAPEIS_DEMOP = ["admingeral", "admin", "BensPatrimoniais"];

/** Confere a senha do militar (user_secrets). Lança permission-denied se não bater. */
async function verificarSenha(uid, senha) {
  if (!senha) throw new HttpsError("invalid-argument", "Confirme com a sua senha.");
  const sec = await db.collection("user_secrets").doc(uid).get();
  if (!sec.exists || String(sec.data().password) !== String(senha)) throw new HttpsError("permission-denied", "Senha incorreta.");
}

async function saoAmigos(a, b) {
  const snap = await db.collection("amizades").doc(idPar(a, b)).get();
  return snap.exists && snap.data().status === "aceita";
}

function resumoMensagem(m) {
  if (m.tipo === "cobranca") return m.card?.subtipo === "devolucao" ? "Cobrança de devolução" : "Cobrança de assinatura";
  if (m.tipo === "transferencia") return `Transferência de cautela: ${m.card?.material_description || "material"}`;
  if (m.tipo === "aviso") return `Aviso: ${m.texto || ""}`;
  return m.texto || "";
}

// ------------------------------------------------------------
// Push: toda mensagem nova notifica o destinatário
// ------------------------------------------------------------
exports.notificarMensagem = onDocumentCreated(
  { document: "conversas/{convId}/mensagens/{msgId}", region: REGION },
  async (event) => {
    const m = event.data?.data();
    if (!m || !m.para || m.para === m.de) return;
    const tokSnap = await db.collection("fcm_tokens").doc(m.para).get();
    const tokens = tokSnap.exists ? (tokSnap.data().tokens || []) : [];
    if (tokens.length === 0) return;

    const remetente = await nomeDe(m.de);
    const titulo = m.tipo === "aviso" ? "Aviso do DEMOP" : remetente.nome;
    const corpo = String(resumoMensagem(m)).slice(0, 180);
    const url = `/mensagens?c=${event.params.convId}`;
    try {
      const resp = await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title: titulo, body: corpo },
        data: { url, conversaId: event.params.convId, tipo: m.tipo || "texto" },
        webpush: {
          headers: { Urgency: "high" },
          notification: { title: titulo, body: corpo, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: `conv-${event.params.convId}`, renotify: true },
          fcmOptions: { link: url },
        },
        android: { priority: "high" },
      });
      // Remove tokens inválidos
      const invalidos = [];
      resp.responses.forEach((r, i) => {
        const code = r.error?.code || "";
        if (!r.success && (code.includes("registration-token-not-registered") || code.includes("invalid-argument"))) invalidos.push(tokens[i]);
      });
      if (invalidos.length) await tokSnap.ref.update({ tokens: FieldValue.arrayRemove(...invalidos) });
    } catch (e) {
      console.error("Erro ao enviar push:", e);
    }
  }
);

// ------------------------------------------------------------
// Push: pedido de amizade novo avisa quem recebe
// ------------------------------------------------------------
exports.notificarAmizade = onDocumentCreated(
  { document: "amizades/{id}", region: REGION },
  async (event) => {
    const a = event.data?.data();
    if (!a || a.status !== "pendente" || !a.destinatario) return;
    const tokSnap = await db.collection("fcm_tokens").doc(a.destinatario).get();
    const tokens = tokSnap.exists ? (tokSnap.data().tokens || []) : [];
    if (tokens.length === 0) return;
    const quem = await nomeDe(a.solicitante);
    const titulo = "Pedido de amizade";
    const corpo = `${quem.nome} quer conversar e transferir cautelas com você. Toque para responder.`;
    try {
      await getMessaging().sendEachForMulticast({
        tokens,
        notification: { title: titulo, body: corpo },
        data: { url: "/home", tipo: "amizade" },
        webpush: { headers: { Urgency: "high" }, notification: { title: titulo, body: corpo, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: `amizade-${event.params.id}` }, fcmOptions: { link: "/home" } },
      });
    } catch (e) { console.error("Erro ao notificar amizade:", e); }
  }
);

// ------------------------------------------------------------
// Aviso do admingeral para todos os militares ativos
// ------------------------------------------------------------
exports.enviarAviso = onCall({ region: REGION, timeoutSeconds: 300 }, async (request) => {
  const uid = exigirAuth(request);
  if (request.auth.token.role !== "admingeral") throw new HttpsError("permission-denied", "Apenas o admingeral envia avisos para todos.");
  const texto = String(request.data?.texto || "").trim();
  if (!texto) throw new HttpsError("invalid-argument", "Escreva o aviso.");
  if (texto.length > 2000) throw new HttpsError("invalid-argument", "Aviso muito longo (máx. 2000 caracteres).");

  const eu = await nomeDe(uid);
  const usuarios = await db.collection("users").get();
  const destinos = usuarios.docs.filter((d) => d.id !== uid && d.data().ativo !== false);
  const agora = FieldValue.serverTimestamp();
  let enviados = 0;
  // Lotes de até 200 destinatários (2 escritas por destinatário, limite 500 por batch)
  for (let i = 0; i < destinos.length; i += 200) {
    const batch = db.batch();
    for (const d of destinos.slice(i, i + 200)) {
      const convId = idPar(uid, d.id);
      const convRef = db.collection("conversas").doc(convId);
      const msgRef = convRef.collection("mensagens").doc();
      const msg = { de: uid, de_nome: eu.nome, para: d.id, texto, tipo: "aviso", card: null, criada_em: agora, lida: false };
      batch.set(msgRef, msg);
      batch.set(convRef, {
        participantes: [uid, d.id].sort(),
        tipo: "direta",
        criada_em: agora,
        atualizada_em: agora,
        ultima: { texto: `Aviso: ${texto.slice(0, 120)}`, de: uid, em: agora, tipo: "aviso" },
        naoLidas: { [d.id]: FieldValue.increment(1), [uid]: 0 },
      }, { merge: true });
      enviados += 1;
    }
    await batch.commit();
  }
  await db.collection("audit_logs").add({
    action: "mensagem_aviso", userId: uid, userName: eu.username || eu.nome, targetCollection: "conversas", targetId: null, targetName: `${enviados} militares`,
    details: { texto: texto.slice(0, 300), destinatarios: enviados }, timestamp: FieldValue.serverTimestamp(),
  });
  return { enviados };
});

// ------------------------------------------------------------
// Pedido de transferência de cautela (quem envia confirma com a senha)
// Destino: amigo (pedido aceito) ou qualquer admin / BensPatrimoniais / admingeral.
// ------------------------------------------------------------
exports.solicitarTransferencia = onCall({ region: REGION }, async (request) => {
  const uid = exigirAuth(request);
  const { movimentacaoId, para, senha } = request.data || {};
  if (!movimentacaoId || !para) throw new HttpsError("invalid-argument", "Cautela e destinatário são obrigatórios.");
  if (para === uid) throw new HttpsError("invalid-argument", "Escolha outro militar.");
  await verificarSenha(uid, senha);

  const [movSnap, paraSnap] = await Promise.all([db.collection("movimentacoes").doc(movimentacaoId).get(), db.collection("users").doc(para).get()]);
  if (!movSnap.exists) throw new HttpsError("not-found", "Cautela não encontrada.");
  if (!paraSnap.exists || paraSnap.data().ativo === false) throw new HttpsError("not-found", "Militar de destino não encontrado ou inativo.");
  const mov = movSnap.data();
  if (mov.type !== "cautela" || mov.status !== "cautelado" || mov.user !== uid) throw new HttpsError("failed-precondition", "Só é possível transferir uma cautela sua que esteja em aberto.");
  if (!mov.signed) throw new HttpsError("failed-precondition", "Assine a cautela antes de transferir.");
  const passagens = Number(mov.passagens) || 0;
  if (passagens >= 3) throw new HttpsError("failed-precondition", "Esta cautela já foi transferida 3 vezes. O material precisa ser devolvido ao DEMOP.");
  const destinoDemop = PAPEIS_DEMOP.includes(paraSnap.data().role);
  if (!destinoDemop && !(await saoAmigos(uid, para))) throw new HttpsError("permission-denied", "Você só pode transferir para amigos ou para o pessoal do DEMOP.");
  const pend = await db.collection("transferencias").where("movimentacaoId", "==", movimentacaoId).where("status", "==", "pendente").limit(1).get();
  if (!pend.empty) throw new HttpsError("already-exists", "Já existe um pedido de transferência pendente para esta cautela.");

  const [eu, ele] = await Promise.all([nomeDe(uid), nomeDe(para)]);
  const convId = idPar(uid, para);
  const convRef = db.collection("conversas").doc(convId);
  const tRef = db.collection("transferencias").doc();
  const msgRef = convRef.collection("mensagens").doc();
  const agora = FieldValue.serverTimestamp();
  const card = { transferenciaId: tRef.id, movimentacaoId, material_description: mov.material_description || "", quantidade: mov.quantity || 0, de: uid, de_nome: eu.nome, para, para_nome: ele.nome, status: "pendente" };
  const texto = `${eu.nome} quer transferir para você a cautela de ${mov.material_description} (${mov.quantity} un.). Ao aceitar, você assina com a sua senha e passa a ser o responsável pelo material.`;
  const batch = db.batch();
  batch.set(msgRef, { de: uid, de_nome: eu.nome, para, texto, tipo: "transferencia", card, criada_em: agora, lida: false });
  batch.set(convRef, { participantes: [uid, para].sort(), tipo: "direta", criada_em: agora, atualizada_em: agora, ultima: { texto: `Transferência: ${mov.material_description || "cautela"}`, de: uid, em: agora, tipo: "transferencia" }, naoLidas: { [para]: FieldValue.increment(1), [uid]: 0 } }, { merge: true });
  batch.set(tRef, { movimentacaoId, de: uid, de_nome: eu.nome, para, para_nome: ele.nome, material: mov.material || null, material_description: mov.material_description || "", quantidade: mov.quantity || 0, status: "pendente", criada_em: agora, respondida_em: null, conversaId: convId, mensagemId: msgRef.id, novaMovimentacaoId: null, confirmada_com_senha: true });
  batch.set(db.collection("audit_logs").doc(), { action: "cautela_transferencia_solicitada", userId: uid, userName: eu.username || eu.nome, targetCollection: "movimentacoes", targetId: movimentacaoId, targetName: mov.material_description || "", details: { para: ele.nome, para_id: para, quantidade: mov.quantity || 0, confirmada_com_senha: true }, timestamp: agora });
  await batch.commit();
  return { transferenciaId: tRef.id, conversaId: convId };
});

// ------------------------------------------------------------
// Transferência de cautela: aceitar (assinando com a senha) ou recusar
// ------------------------------------------------------------
exports.responderTransferencia = onCall({ region: REGION }, async (request) => {
  const uid = exigirAuth(request);
  const { transferenciaId, aceitar, senha } = request.data || {};
  if (!transferenciaId) throw new HttpsError("invalid-argument", "Transferência não informada.");
  if (aceitar) await verificarSenha(uid, senha); // aceitar = assinar

  const tRef = db.collection("transferencias").doc(transferenciaId);
  const resultado = await db.runTransaction(async (tx) => {
    const tSnap = await tx.get(tRef);
    if (!tSnap.exists) throw new HttpsError("not-found", "Transferência não encontrada.");
    const t = tSnap.data();
    if (t.para !== uid) throw new HttpsError("permission-denied", "Só quem recebe a cautela pode responder.");
    if (t.status !== "pendente") throw new HttpsError("failed-precondition", "Esta transferência já foi respondida.");

    const movRef = db.collection("movimentacoes").doc(t.movimentacaoId);
    const movSnap = await tx.get(movRef);
    if (!movSnap.exists) throw new HttpsError("not-found", "Cautela original não encontrada.");
    const mov = movSnap.data();
    if (mov.status !== "cautelado" || mov.user !== t.de) throw new HttpsError("failed-precondition", "A cautela original não está mais em aberto com quem transferiu.");
    if (!mov.signed) throw new HttpsError("failed-precondition", "Só cautelas já assinadas podem ser transferidas.");
    const passagens = Number(mov.passagens) || 0;
    if (passagens >= 3) throw new HttpsError("failed-precondition", "Esta cautela já foi transferida 3 vezes. O material precisa ser devolvido ao DEMOP.");

    const agora = Timestamp.now();
    const [quemRecebe, quemEnvia] = await Promise.all([nomeDe(t.para), nomeDe(t.de)]);
    const convRef = db.collection("conversas").doc(t.conversaId || idPar(t.de, t.para));
    let novaId = null;

    if (aceitar) {
      const novaRef = db.collection("movimentacoes").doc();
      novaId = novaRef.id;
      const nova = {
        type: "cautela",
        material: mov.material,
        material_description: mov.material_description || t.material_description || "",
        categoria: mov.categoria || null,
        quantity: mov.quantity,
        date: agora,
        sender: t.de,
        sender_name: quemEnvia.nome,
        user: t.para,
        user_name: quemRecebe.nome,
        user_rg: quemRecebe.rg || null,
        telefone_responsavel: quemRecebe.telefone || null,
        viatura: null,
        viatura_description: null,
        status: "cautelado",
        signed: true,
        signed_date: agora,
        observacoes: `Recebida por transferência de ${quemEnvia.nome} (cautela original ${t.movimentacaoId}); assinada com senha pelo app`,
        assinatura_por_senha: true,
        transferido_de: t.de,
        transferido_de_nome: quemEnvia.nome,
        origem_movimentacao: t.movimentacaoId,
        transferencia_id: transferenciaId,
        passagens: passagens + 1, // contagem de transferencias na cadeia (maximo 3 ate voltar ao DEMOP)
      };
      tx.set(novaRef, nova);
      tx.update(movRef, {
        status: "transferido", // equivale a devolvida para quem transferiu
        returned_date: agora,
        transferido_para: t.para,
        transferido_para_nome: quemRecebe.nome,
        transferido_em: agora,
        transferencia_id: transferenciaId,
        nova_movimentacao: novaId,
      });
    }
    tx.update(tRef, { status: aceitar ? "aceita" : "recusada", respondida_em: agora, novaMovimentacaoId: novaId });
    if (t.mensagemId) {
      tx.update(convRef.collection("mensagens").doc(t.mensagemId), { "card.status": aceitar ? "aceita" : "recusada", "card.respondida_em": agora, "card.novaMovimentacaoId": novaId });
    }
    const texto = aceitar
      ? `${quemRecebe.nome} aceitou e assinou a transferência de ${t.material_description} (${t.quantidade} un.).`
      : `${quemRecebe.nome} recusou a transferência de ${t.material_description}.`;
    const sysRef = convRef.collection("mensagens").doc();
    tx.set(sysRef, { de: t.para, de_nome: quemRecebe.nome, para: t.de, texto, tipo: "sistema", card: null, criada_em: agora, lida: false });
    tx.set(convRef, { atualizada_em: agora, ultima: { texto, de: t.para, em: agora, tipo: "sistema" }, naoLidas: { [t.de]: FieldValue.increment(1) } }, { merge: true });
    tx.set(db.collection("audit_logs").doc(), {
      action: aceitar ? "cautela_transferida" : "cautela_transferencia_recusada",
      userId: uid, userName: quemRecebe.username || quemRecebe.nome, targetCollection: "movimentacoes", targetId: aceitar ? novaId : t.movimentacaoId,
      targetName: t.material_description || "",
      details: { de: quemEnvia.nome, de_id: t.de, para: quemRecebe.nome, para_id: t.para, material: t.material_description, quantidade: t.quantidade, cautela_original: t.movimentacaoId, nova_cautela: novaId },
      timestamp: agora,
    });
    return { novaId };
  });
  return { ok: true, ...resultado };
});

// ------------------------------------------------------------
// Presença: encerra sessões sem batimento há mais de 3 minutos
// ------------------------------------------------------------
exports.encerrarSessoesInativas = onSchedule(
  { schedule: "*/5 * * * *", timeZone: "America/Sao_Paulo", region: REGION },
  async () => {
    const limite = Timestamp.fromMillis(Date.now() - 3 * 60 * 1000);
    const snap = await db.collection("presenca").where("online", "==", true).get();
    const batch = db.batch();
    let n = 0;
    for (const d of snap.docs) {
      const p = d.data();
      const ultima = p.ultima_atividade;
      if (!ultima || ultima.toMillis() < limite.toMillis()) {
        batch.update(d.ref, { online: false, ultimo_logout: ultima || FieldValue.serverTimestamp(), encerrada_por: "inatividade" });
        if (p.sessaoId) {
          batch.set(db.collection("sessoes").doc(p.sessaoId), { fim: ultima || FieldValue.serverTimestamp(), encerrada_por: "inatividade", ativa: false }, { merge: true });
        }
        n += 1;
      }
    }
    if (n) await batch.commit();
    if (n) console.log(`Sessões encerradas por inatividade: ${n}`);
  }
);
