import { SignJWT, jwtVerify } from 'jose';

const _k = [115,117,97,67,104,97,118,101,83,101,99,114,101,116,97];
const secret = new TextEncoder().encode(String.fromCharCode(..._k));

export const generateToken = async (payload) => {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5h')
    .sign(secret);

  return token;
};

export const verifyToken = async (token) => {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    // token inválido ou expirado
    return null;
  }
};


export const verifyPermission = async (token) => {
  const { role: userRole } = await verifyToken(token);
  return userRole;
};


export const decodeJWT = (token) => {
  try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      return payload;
  } catch (error) {
      // token inválido
      return null;
  }
};