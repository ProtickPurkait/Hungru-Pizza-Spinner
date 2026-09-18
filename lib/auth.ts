import { SignJWT, jwtVerify } from 'jose';

export const ADMIN_COOKIE_NAME = 'hp_admin_session';

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) {
    throw new Error('ADMIN_COOKIE_SECRET is not set.');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}
