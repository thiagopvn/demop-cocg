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
//    Receives { username, password }, returns user data (no password)
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

  return {
    userId,
    username: userData.username,
    email: userData.email,
    role: userData.role,
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

  // Create Firebase Auth account
  let authUser;
  try {
    authUser = await auth.createUser({
      email,
      password: email + "-cocg-auth",
      displayName: full_name,
    });
  } catch (e) {
    // If user already exists in auth, get them
    if (e.code === "auth/email-already-exists") {
      authUser = await auth.getUserByEmail(email);
    } else {
      throw new HttpsError("internal", "Erro ao criar conta de autenticação: " + e.message);
    }
  }

  // Set custom claims
  await auth.setCustomUserClaims(authUser.uid, { role: "admin", firestoreId: userRef.id });

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

  // Create Firebase Auth account
  let authUser;
  try {
    authUser = await auth.createUser({
      email,
      password: email + "-cocg-auth",
      displayName: full_name,
    });
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      authUser = await auth.getUserByEmail(email);
    } else {
      throw new HttpsError("internal", "Erro ao criar conta de autenticação: " + e.message);
    }
  }

  // Set custom claims
  await auth.setCustomUserClaims(authUser.uid, { role, firestoreId: userRef.id });

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

  // Get user data to find email
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Usuário não encontrado.");
  }

  const email = userDoc.data().email;

  // Delete user_secrets
  try {
    await db.collection("user_secrets").doc(userId).delete();
  } catch (_e) {
    // ignore if not found
  }

  // Delete user doc
  await db.collection("users").doc(userId).delete();

  // Delete Firebase Auth user
  if (email) {
    try {
      const authUser = await auth.getUserByEmail(email);
      await auth.deleteUser(authUser.uid);
    } catch (_e) {
      // ignore if not found in auth
    }
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

    if (before.role === after.role) {
      return; // No role change
    }

    const email = after.email;
    if (!email) return;

    try {
      const authUser = await auth.getUserByEmail(email);
      const existingClaims = authUser.customClaims || {};
      await auth.setCustomUserClaims(authUser.uid, {
        ...existingClaims,
        role: after.role,
      });
      console.log(`Custom claims updated for ${email}: role=${after.role}`);
    } catch (e) {
      console.error(`Error updating custom claims for ${email}:`, e);
    }
  }
);

// ============================================================
// h) migrateExistingUsers — callable (one-time migration)
//    Moves passwords to user_secrets, creates Firebase Auth accounts,
//    sets Custom Claims
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

      // 3. Create Firebase Auth account if not exists
      let authUser;
      if (data.email) {
        try {
          authUser = await auth.getUserByEmail(data.email);
        } catch (_e) {
          authUser = await auth.createUser({
            email: data.email,
            password: data.email + "-cocg-auth",
            displayName: data.full_name || data.username,
          });
        }

        // 4. Set Custom Claims
        await auth.setCustomUserClaims(authUser.uid, {
          role: data.role || "user",
          firestoreId: userId,
        });
      }

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
