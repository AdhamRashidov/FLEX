import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Parolni bcrypt yordamida xavfsiz heshlash
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Sinxron heshlash (seed yoki bootstrap uchun)
 */
export function hashPasswordSync(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Parolni bcrypt yordamida tekshirish (Timing-safe)
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, storedHash);
  } catch {
    return false;
  }
}

/**
 * Sinxron tekshirish
 */
export function verifyPasswordSync(password: string, storedHash: string): boolean {
  try {
    return bcrypt.compareSync(password, storedHash);
  } catch {
    return false;
  }
}
