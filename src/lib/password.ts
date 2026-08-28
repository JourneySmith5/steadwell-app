import bcrypt from "bcryptjs";

// §2 Authentication & Security: minimum 8 characters, 1 uppercase letter,
// 1 number, and 1 special character.
export function validatePasswordPolicy(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Be at least 8 characters long.");
  if (!/[A-Z]/.test(password)) errors.push("Contain at least one uppercase letter.");
  if (!/[0-9]/.test(password)) errors.push("Contain at least one number.");
  if (!/[^a-zA-Z0-9]/.test(password)) errors.push("Contain at least one special character.");
  return errors;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
