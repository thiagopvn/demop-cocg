// filepath: /d:/Source/projeto-thiago/src/utils/auth.js
import { SignJWT, jwtVerify } from 'jose';

const secretKey = 'suaChaveSecreta'; // Substitua por uma chave secreta forte
const secret = new TextEncoder().encode(secretKey);

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
    console.log("Erro ao verificar token:", error); // Adicione este log
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
      console.error('Erro ao decodificar token:', error);
      return null;
  }
};