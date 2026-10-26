import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { UserRole } from '../../platform-saas/users/constants/role.enum';
import { Scope } from '../../platform-saas/users/constants/scope.enum';

/** Mismo mínimo que valida el backoffice. */
export const MIN_ADMIN_PASSWORD_LENGTH = 8;

const PLATFORM_NAME = 'X7 POS Platform';

export interface AdminSeedInput {
  email?: string;
  password?: string;
}

export type AdminSeedResult =
  | { created: true; userId: number; email: string }
  | { created: false; existingEmail: string };

/**
 * Crea el primer portal_admin (con su compañía y comercio de plataforma: el login exige
 * un comercio). Si ya hay uno, no hace nada: el resto de los usuarios se crea desde el
 * backoffice.
 */
export async function seedAdmin(
  dataSource: DataSource,
  input: AdminSeedInput,
): Promise<AdminSeedResult> {
  const email = input.email?.trim() ?? '';
  const password = input.password ?? '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('SEED_ADMIN_EMAIL must be a valid email address');
  }
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`,
    );
  }

  const hash = await bcrypt.hash(password, 10);
  return dataSource.transaction(async (manager) => {
    const [existing] = await manager.query<{ email: string }[]>(
      `SELECT email FROM users WHERE role = $1 ORDER BY id LIMIT 1`,
      [UserRole.PORTAL_ADMIN],
    );
    if (existing) return { created: false, existingEmail: existing.email };

    const [taken] = await manager.query<{ id: number }[]>(
      `SELECT id FROM users WHERE email = $1`,
      [email],
    );
    if (taken) {
      throw new Error(`A user with email ${email} already exists`);
    }

    const [company] = await manager.query<{ id: number }[]>(
      `INSERT INTO company (name, email) VALUES ($1, $2) RETURNING id`,
      [PLATFORM_NAME, email],
    );
    const [merchant] = await manager.query<{ id: number }[]>(
      `INSERT INTO merchant (name, email, "companyId") VALUES ($1, $2, $3) RETURNING id`,
      [PLATFORM_NAME, email, company.id],
    );
    const [user] = await manager.query<{ id: number }[]>(
      `INSERT INTO users (username, email, password, role, scope, "merchantId")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        email.split('@')[0],
        email,
        hash,
        UserRole.PORTAL_ADMIN,
        Scope.ADMIN_PORTAL,
        merchant.id,
      ],
    );
    return { created: true, userId: Number(user.id), email };
  });
}
