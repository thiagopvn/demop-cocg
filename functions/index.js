const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
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

  // Try user_secrets first, then fallback to users.password (for migration)
  let storedPassword = null;
  try {
    const secretDoc = await db.collection("user_secrets").doc(userId).get();
    if (secretDoc.exists) {
      storedPassword = secretDoc.data().password;
    }
  } catch (_e) {
    // ignore — secrets collection might not exist yet
  }

  if (!storedPassword) {
    storedPassword = userData.password;
  }

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

  return {
    userId,
    username: userData.username,
    email: userData.email,
    role,
    customToken,
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

  // Store password in user_secrets
  await db.collection("user_secrets").doc(userRef.id).set({
    password,
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

  // Store password in user_secrets
  await db.collection("user_secrets").doc(userRef.id).set({
    password,
    updated_at: new Date(),
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
// f) updateUserPassword — callable (admin/admingeral only)
// ============================================================
exports.updateUserPassword = onCall({ region: "southamerica-east1" }, async (request) => {
  requireAdmin(request);

  const { userId, password } = request.data || {};
  if (!userId || !password) {
    throw new HttpsError("invalid-argument", "userId e password são obrigatórios.");
  }

  await db.collection("user_secrets").doc(userId).set(
    { password, updated_at: new Date() },
    { merge: true }
  );

  return { message: "Senha atualizada com sucesso." };
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
