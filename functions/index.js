const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

initializeApp();
const db = getFirestore();
const auth = getAuth();

// ============================================================
// Helper: verify caller has admin or admingeral role
// ============================================================
function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }
  const role = request.auth.token.role;
  if (role !== "admin" && role !== "admingeral") {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem realizar esta ação."
    );
  }
}

// ============================================================
// a) verifyLogin — callable
//    Receives { username, password }, returns user data + custom token
// ============================================================
exports.verifyLogin = onCall({ region: "southamerica-east1" }, async (request) => {
  const { username, password } = request.data || {};

  if (!username || !password) {
    throw new HttpsError("invalid-argument", "Username e senha são obrigatórios.");
  }

  // Search by username first, then by email
  let snap = await db
    .collection("users")
    .where("username", "==", username)
    .limit(1)
    .get();

  if (snap.empty) {
    snap = await db
      .collection("users")
      .where("email", "==", username)
      .limit(1)
      .get();
  }

  if (snap.empty) {
    throw new HttpsError("not-found", "Usuário não encontrado.");
  }

  const userDoc = snap.docs[0];
  const userData = userDoc.data();
  const userId = userDoc.id;

  // Block inactive users
  if (userData.ativo === false) {
    throw new HttpsError("permission-denied", "Conta desativada. Entre em contato com o administrador.");
  }

  // Read password from user_secrets
  const secretDoc = await db.collection("user_secrets").doc(userId).get();
  const storedPassword = secretDoc.exists ? secretDoc.data().password : null;

  if (!storedPassword || storedPassword !== password) {
    throw new HttpsError("permission-denied", "Senha incorreta.");
  }

  // Ensure Firebase Auth user exists with correct custom claims
  const role = userData.role || "user";
  let authUid = userId; // default: use Firestore doc ID as Auth UID

  try {
    // First, try to find existing Auth user by Firestore doc ID
    await auth.getUser(userId);
    authUid = userId;
  } catch (_e1) {
    // No Auth user with Firestore doc ID — try to find by email
    let existingByEmail = null;
    if (userData.email) {
      try {
        existingByEmail = await auth.getUserByEmail(userData.email);
      } catch (_e2) {
        // No Auth user with this email either
      }
    }

    if (existingByEmail) {
      // Use existing email-based Auth user
      authUid = existingByEmail.uid;
    } else {
      // Create new Auth user with Firestore doc ID as UID
      const createData = { uid: userId, displayName: userData.full_name || userData.username };
      if (userData.email && userData.email.includes("@") && userData.email.includes(".")) {
        createData.email = userData.email;
      }
      await auth.createUser(createData);
      authUid = userId;
    }
  }

  // Always update custom claims on login
  await auth.setCustomUserClaims(authUid, { role, firestoreId: userId });

  // Generate a Firebase Custom Token
  const customToken = await auth.createCustomToken(authUid, {
    role,
    firestoreId: userId,
  });

  const mustChangePassword = secretDoc.exists && secretDoc.data().must_change_password === true;

  return {
    userId,
    username: userData.username,
    email: userData.email,
    role,
    customToken,
    mustChangePassword,
  };
});

// ============================================================
// b) checkHasUsers — callable (no auth required)
//    Returns { hasUsers: boolean }
// ============================================================
exports.checkHasUsers = onCall({ region: "southamerica-east1" }, async () => {
  const snap = await db.collection("users").limit(1).get();
  return { hasUsers: !snap.empty };
});

// ============================================================
// c) createFirstUser — callable (no auth required)
//    Creates the very first user (admin) when collection is empty
// ============================================================
exports.createFirstUser = onCall({ region: "southamerica-east1" }, async (request) => {
  const data = request.data || {};

  // Verify no users exist
  const existingSnap = await db.collection("users").limit(1).get();
  if (!existingSnap.empty) {
    throw new HttpsError(
      "already-exists",
      "Já existem usuários no sistema. Não é possível usar o primeiro acesso."
    );
  }

  const { username, full_name, email, password, rg, telefone, obm } = data;

  if (!username || !full_name || !email || !password || !rg || !telefone || !obm) {
    throw new HttpsError("invalid-argument", "Todos os campos são obrigatórios.");
  }

  // Create user doc (without password)
  const userRef = await db.collection("users").add({
    username,
    full_name,
    full_name_lower: full_name.toLowerCase(),
    email,
    role: "admin",
    rg,
    telefone,
    OBM: obm,
    created_at: new Date(),
  });

  // Store password in user_secrets (with identifying info for admingeral)
  await db.collection("user_secrets").doc(userRef.id).set({
    password,
    username,
    full_name,
    rg,
    updated_at: new Date(),
  });

  return { userId: userRef.id, message: "Primeiro usuário criado com sucesso." };
});

// ============================================================
// d) createUserAccount — callable (admin/admingeral only)
// ============================================================
exports.createUserAccount = onCall({ region: "southamerica-east1" }, async (request) => {
  requireAdmin(request);

  const data = request.data || {};
  const { username, full_name, email, password, role, rg, telefone, obm } = data;

  if (!username || !full_name || !email || !password || !role || !rg || !telefone || !obm) {
    throw new HttpsError("invalid-argument", "Todos os campos são obrigatórios.");
  }

  // Hierarchy: only admingeral can create admingeral users
  if (role === "admingeral" && request.auth.token.role !== "admingeral") {
    throw new HttpsError("permission-denied", "Apenas o administrador geral pode criar usuários admingeral.");
  }

  // Check unique username
  const usernameSnap = await db
    .collection("users")
    .where("username", "==", username)
    .limit(1)
    .get();
  if (!usernameSnap.empty) {
    throw new HttpsError("already-exists", "Username já cadastrado.");
  }

  // Check unique email
  const emailSnap = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (!emailSnap.empty) {
    throw new HttpsError("already-exists", "Email já cadastrado.");
  }

  // Create user doc (without password)
  const userRef = await db.collection("users").add({
    username,
    full_name,
    full_name_lower: full_name.toLowerCase(),
    email,
    role,
    rg,
    telefone,
    OBM: obm,
    created_at: new Date(),
  });

  // Store password in user_secrets (with identifying info for admingeral)
  await db.collection("user_secrets").doc(userRef.id).set({
    password,
    username,
    full_name,
    rg,
    updated_at: new Date(),
    must_change_password: true,
  });

  return { userId: userRef.id, message: "Usuário criado com sucesso." };
});

// ============================================================
// e) deleteUserAccount — callable (admin/admingeral only)
// ============================================================
exports.deleteUserAccount = onCall({ region: "southamerica-east1" }, async (request) => {
  requireAdmin(request);

  const { userId } = request.data || {};
  if (!userId) {
    throw new HttpsError("invalid-argument", "userId é obrigatório.");
  }

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Usuário não encontrado.");
  }

  // Hierarchy: only admingeral can delete admingeral users
  if (userDoc.data().role === "admingeral" && request.auth.token.role !== "admingeral") {
    throw new HttpsError("permission-denied", "Apenas o administrador geral pode excluir usuários admingeral.");
  }

  // Delete user_secrets
  try {
    await db.collection("user_secrets").doc(userId).delete();
  } catch (_e) {
    // ignore if not found
  }

  // Delete user doc
  await db.collection("users").doc(userId).delete();

  // Delete Firebase Auth user (UID = Firestore doc ID)
  try {
    await auth.deleteUser(userId);
  } catch (_e) {
    // ignore if not found in auth
  }

  return { message: "Usuário excluído com sucesso." };
});

// ============================================================
// f) resetUserPassword — callable (admin/admingeral only)
//    Resets password to "123456" and flags must_change_password
// ============================================================
exports.resetUserPassword = onCall({ region: "southamerica-east1" }, async (request) => {
  requireAdmin(request);

  const { userId } = request.data || {};
  if (!userId) {
    throw new HttpsError("invalid-argument", "userId é obrigatório.");
  }

  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Usuário não encontrado.");
  }

  // Hierarchy: only admingeral can reset admingeral passwords
  if (userDoc.data().role === "admingeral" && request.auth.token.role !== "admingeral") {
    throw new HttpsError("permission-denied", "Apenas o administrador geral pode resetar senhas de admingeral.");
  }

  await db.collection("user_secrets").doc(userId).set(
    { password: "123456", must_change_password: true, updated_at: new Date() },
    { merge: true }
  );

  return { message: "Senha resetada para 123456." };
});

// ============================================================
// f2) changeOwnPassword — callable (any authenticated user)
//     Allows user to change their own password
// ============================================================
exports.changeOwnPassword = onCall({ region: "southamerica-east1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const firestoreId = request.auth.token.firestoreId;
  if (!firestoreId) {
    throw new HttpsError("failed-precondition", "Usuário sem ID no Firestore.");
  }

  const { currentPassword, newPassword } = request.data || {};
  if (!newPassword) {
    throw new HttpsError("invalid-argument", "Nova senha é obrigatória.");
  }

  if (newPassword === "123456") {
    throw new HttpsError("invalid-argument", "A nova senha não pode ser 123456.");
  }

  const secretDoc = await db.collection("user_secrets").doc(firestoreId).get();
  if (!secretDoc.exists) {
    throw new HttpsError("not-found", "Dados de senha não encontrados.");
  }

  const secretData = secretDoc.data();

  // If NOT a forced change, verify current password
  if (!secretData.must_change_password) {
    if (!currentPassword || currentPassword !== secretData.password) {
      throw new HttpsError("permission-denied", "Senha atual incorreta.");
    }
  }

  await db.collection("user_secrets").doc(firestoreId).set(
    { password: newPassword, must_change_password: false, updated_at: new Date() },
    { merge: true }
  );

  return { message: "Senha alterada com sucesso." };
});

// ============================================================
// g) onUserRoleUpdate — Firestore trigger
//    When role field changes, update Custom Claims
// ============================================================
exports.onUserRoleUpdate = onDocumentUpdated(
  { document: "users/{userId}", region: "southamerica-east1" },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const userId = event.params.userId;

    if (before.role === after.role) {
      return; // No role change
    }

    try {
      // UID = Firestore doc ID
      await auth.getUser(userId);
      await auth.setCustomUserClaims(userId, {
        role: after.role,
        firestoreId: userId,
      });
      console.log(`Custom claims updated for ${userId}: role=${after.role}`);
    } catch (e) {
      // User hasn't logged in yet (no Auth account) — claims will be set on first login
      console.log(`Auth user ${userId} not found, claims will be set on login: ${e.message}`);
    }
  }
);

// ============================================================
// h) migrateExistingUsers — callable (one-time migration)
//    Moves passwords to user_secrets, removes from users docs
// ============================================================
exports.migrateExistingUsers = onCall({ region: "southamerica-east1", timeoutSeconds: 300 }, async (request) => {
  requireAdmin(request);

  const usersSnap = await db.collection("users").get();
  const results = { migrated: 0, errors: [], total: usersSnap.size };
  console.log(`Starting migration for ${usersSnap.size} users`);

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const userId = userDoc.id;
    console.log(`Migrating user: ${userId} (${data.username || data.email})`);

    try {
      // 1. Copy password to user_secrets if exists
      if (data.password) {
        await db.collection("user_secrets").doc(userId).set(
          { password: data.password, updated_at: new Date() },
          { merge: true }
        );
      }

      // 2. Remove password from users doc
      await db.collection("users").doc(userId).update({
        password: FieldValue.delete(),
      });

      results.migrated++;
      console.log(`Successfully migrated user: ${userId}`);
    } catch (e) {
      console.error(`Error migrating user ${userId}:`, e.message);
      results.errors.push({ userId, error: e.message });
    }
  }

  console.log(`Migration complete: ${results.migrated}/${results.total} migrated, ${results.errors.length} errors`);
  return results;
});

// ============================================================
// i) enrichUserSecrets — callable (one-time)
//    Adds username, full_name, rg to existing user_secrets docs
// ============================================================
exports.enrichUserSecrets = onCall({ region: "southamerica-east1", timeoutSeconds: 300 }, async (request) => {
  requireAdmin(request);

  const secretsSnap = await db.collection("user_secrets").get();
  const results = { updated: 0, errors: [], total: secretsSnap.size };
  console.log(`Enriching ${secretsSnap.size} user_secrets docs`);

  for (const secretDoc of secretsSnap.docs) {
    const userId = secretDoc.id;
    try {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        results.errors.push({ userId, error: "user doc not found" });
        continue;
      }
      const userData = userDoc.data();
      await db.collection("user_secrets").doc(userId).update({
        username: userData.username || "",
        full_name: userData.full_name || "",
        rg: userData.rg || "",
      });
      results.updated++;
    } catch (e) {
      console.error(`Error enriching ${userId}:`, e.message);
      results.errors.push({ userId, error: e.message });
    }
  }

  console.log(`Enrich complete: ${results.updated}/${results.total} updated, ${results.errors.length} errors`);
  return results;
});

// ============================================================
// AGGREGATION: Helper — recalculate maintenance stats
// ============================================================
async function recalculateMaintenanceStats() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Single fetch of all manutencoes
  const allSnap = await db.collection("manutencoes").get();
  const allDocs = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Compute counts
  let overdue = 0;
  let scheduled = 0;
  let completed = 0;
  let pending = 0;
  let recurrent = 0;
  let todayCount = 0;

  // Chart data
  const typeCount = {};
  const priorityCount = { baixa: 0, media: 0, alta: 0, critica: 0 };

  // By month (last 6 months)
  const monthKeys = [];
  const monthCount = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthKeys.push(key);
    monthCount[key] = { programadas: 0, concluidas: 0 };
  }

  for (const item of allDocs) {
    const dueDate = item.dueDate?.toDate ? item.dueDate.toDate() : (item.dueDate ? new Date(item.dueDate) : null);

    // Status counts
    if (item.status === "concluida") {
      completed++;
    } else if (item.status === "pendente") {
      pending++;
      if (dueDate && dueDate < startOfDay) overdue++;
      else if (dueDate && dueDate >= startOfDay) scheduled++;
    } else if (item.status === "em_andamento") {
      pending++;
    }

    // Today count
    if (dueDate && dueDate >= startOfDay && dueDate <= endOfDay &&
        (item.status === "pendente" || item.status === "em_andamento")) {
      todayCount++;
    }

    // Recurrent
    if (item.isRecurrent === true && (item.status === "pendente" || item.status === "em_andamento")) {
      recurrent++;
    }

    // Type chart
    const type = item.type || "outros";
    typeCount[type] = (typeCount[type] || 0) + 1;

    // Priority chart
    const priority = item.priority || "media";
    if (priorityCount[priority] !== undefined) {
      priorityCount[priority]++;
    }

    // Month chart
    if (dueDate) {
      const mKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthCount[mKey]) {
        monthCount[mKey].programadas++;
        if (item.status === "concluida") {
          monthCount[mKey].concluidas++;
        }
      }
    }
  }

  // Materials counts (em_manutencao, inoperante)
  const [emManutSnap, inoperanteSnap] = await Promise.all([
    db.collection("materials").where("maintenance_status", "==", "em_manutencao").count().get(),
    db.collection("materials").where("maintenance_status", "==", "inoperante").count().get(),
  ]);

  const byType = Object.entries(typeCount).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const byPriority = [
    { name: "Baixa", value: priorityCount.baixa, color: "#9e9e9e" },
    { name: "Média", value: priorityCount.media, color: "#2196f3" },
    { name: "Alta", value: priorityCount.alta, color: "#ff9800" },
    { name: "Crítica", value: priorityCount.critica, color: "#f44336" },
  ].filter((item) => item.value > 0);

  const byMonth = monthKeys.map((key) => {
    const d = new Date(key + "-01");
    const name = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    return { name, ...monthCount[key] };
  });

  const statsDoc = {
    stats: {
      inMaintenance: emManutSnap.data().count,
      overdue,
      inoperant: inoperanteSnap.data().count,
      scheduled,
      completed,
      pending,
      recurrent,
      todayCount,
    },
    chartData: { byType, byPriority, byMonth },
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection("aggregations").doc("maintenance_stats").set(statsDoc);
  console.log("Maintenance stats aggregation updated:", JSON.stringify(statsDoc.stats));
  return statsDoc;
}

// ============================================================
// j) onMaintenanceChange — Firestore trigger
//    Recalculates aggregation when any manutencao is created/updated/deleted
// ============================================================
exports.onMaintenanceChange = onDocumentWritten(
  { document: "manutencoes/{docId}", region: "southamerica-east1" },
  async () => {
    try {
      await recalculateMaintenanceStats();
    } catch (e) {
      console.error("Error recalculating maintenance stats:", e);
    }
  }
);

// ============================================================
// k) onMaterialStatusChange — Firestore trigger
//    Recalculates aggregation when material maintenance_status changes
// ============================================================
exports.onMaterialStatusChange = onDocumentUpdated(
  { document: "materials/{docId}", region: "southamerica-east1" },
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Only recalculate if maintenance_status changed
    if (before.maintenance_status === after.maintenance_status) return;

    try {
      await recalculateMaintenanceStats();
    } catch (e) {
      console.error("Error recalculating maintenance stats on material change:", e);
    }
  }
);

// ============================================================
// l) scheduledMaintenanceStatsUpdate — Cron (daily at 6:00 AM BRT)
//    Recalculates stats daily to keep "overdue" and "today" counts accurate
// ============================================================
exports.scheduledMaintenanceStatsUpdate = onSchedule(
  {
    schedule: "0 6 * * *",
    timeZone: "America/Sao_Paulo",
    region: "southamerica-east1",
  },
  async () => {
    try {
      await recalculateMaintenanceStats();
      console.log("Scheduled maintenance stats update completed.");
    } catch (e) {
      console.error("Error in scheduled maintenance stats update:", e);
    }
  }
);
