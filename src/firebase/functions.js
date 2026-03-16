import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

let functions;
try {
  const app = getApp();
  functions = getFunctions(app, 'southamerica-east1');
} catch {
  // App not initialized yet — will be initialized by db.js
  functions = null;
}

// Connect to emulator in development (uncomment if using local emulator)
// if (window.location.hostname === 'localhost') {
//   connectFunctionsEmulator(functions, 'localhost', 5001);
// }

function getCallable(name) {
  if (!functions) {
    const app = getApp();
    functions = getFunctions(app, 'southamerica-east1');
  }
  return httpsCallable(functions, name);
}

export async function callVerifyLogin(username, password) {
  const fn = getCallable('verifyLogin');
  const result = await fn({ username, password });
  return result.data;
}

export async function callCheckHasUsers() {
  const fn = getCallable('checkHasUsers');
  const result = await fn();
  return result.data;
}

export async function callCreateFirstUser(userData) {
  const fn = getCallable('createFirstUser');
  const result = await fn(userData);
  return result.data;
}

export async function callCreateUserAccount(userData) {
  const fn = getCallable('createUserAccount');
  const result = await fn(userData);
  return result.data;
}

export async function callDeleteUserAccount(userId) {
  const fn = getCallable('deleteUserAccount');
  const result = await fn({ userId });
  return result.data;
}

export async function callResetUserPassword(userId) {
  const fn = getCallable('resetUserPassword');
  const result = await fn({ userId });
  return result.data;
}

export async function callChangeOwnPassword(currentPassword, newPassword) {
  const fn = getCallable('changeOwnPassword');
  const result = await fn({ currentPassword, newPassword });
  return result.data;
}

export async function callMigrateExistingUsers() {
  const fn = getCallable('migrateExistingUsers');
  const result = await fn();
  return result.data;
}

export async function callGetCalendarMaintenances(year, month) {
  const fn = getCallable('getCalendarMaintenances');
  const result = await fn({ year, month });
  return result.data;
}
