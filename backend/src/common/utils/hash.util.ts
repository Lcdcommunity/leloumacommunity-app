// backend/src/common/utils/hash.util.ts
import * as bcrypt from 'bcryptjs';

export async function hashPassword(value: string): Promise<string> {
  return bcrypt.hash(value, 12);
}

export async function verifyPassword(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}