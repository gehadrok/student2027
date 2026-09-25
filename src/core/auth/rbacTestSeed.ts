/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-6 TEST-ONLY seed helper. NOT used in production code paths.
 *
 * Inserts an evidenced `admin`/`teacher` role pair, a minimal `master_data`
 * permission set, and two test users, then links them. This is deliberately
 * scoped test scaffolding: the PRODUCTION role/permission/user seed is
 * DESIGN_REQUIRED (see preflight audit) and is intentionally NOT fabricated
 * here — production remains deny-by-default until an operator provisions it.
 */
import { IDataSource } from '../datasource/IDataSource';
import { HashService } from '../security/HashService';

export const TEST_PASSWORD = 'Test@1234!pg6';
export const TEST_ADMIN_EMAIL = 'pg6_admin@test.local';
export const TEST_TEACHER_EMAIL = 'pg6_teacher@test.local';
export const TEST_ADMIN_ID = 'pg6_user_admin';
export const TEST_TEACHER_ID = 'pg6_user_teacher';

const ROLE_ADMIN = 'pg6_role_admin';
const ROLE_TEACHER = 'pg6_role_teacher';

export async function seedRbacTestData(ds: IDataSource): Promise<void> {
  const hash = await new HashService().hash(TEST_PASSWORD);

  await ds.execute(
    `INSERT INTO roles (id, code, name_ar, name_en, is_system, is_active) VALUES (?,?,?,?,?,?)
     ON CONFLICT (id) DO NOTHING`,
    [ROLE_ADMIN, 'admin', 'مدير النظام', 'System Admin', 1, 1]
  );
  await ds.execute(
    `INSERT INTO roles (id, code, name_ar, name_en, is_system, is_active) VALUES (?,?,?,?,?,?)
     ON CONFLICT (id) DO NOTHING`,
    [ROLE_TEACHER, 'teacher', 'معلم', 'Teacher', 1, 1]
  );

  const perms = [
    ['pg6_perm_md_read', 'master_data:read', 'master_data', 'read'],
    ['pg6_perm_md_create', 'master_data:create', 'master_data', 'create'],
    ['pg6_perm_md_update', 'master_data:update', 'master_data', 'update'],
    ['pg6_perm_md_delete', 'master_data:delete', 'master_data', 'delete'],
  ];
  for (const [id, code, resource, action] of perms) {
    await ds.execute(
      `INSERT INTO permissions (id, code, resource, action, is_active) VALUES (?,?,?,?,1)
       ON CONFLICT (id) DO NOTHING`,
      [id, code, resource, action]
    );
  }

  // admin => all four; teacher => read only
  const adminLinks = ['pg6_perm_md_read', 'pg6_perm_md_create', 'pg6_perm_md_update', 'pg6_perm_md_delete'];
  for (const pid of adminLinks) {
    await ds.execute(
      `INSERT INTO role_permissions (role_id, permission_id) VALUES (?,?) ON CONFLICT DO NOTHING`,
      [ROLE_ADMIN, pid]
    );
  }
  await ds.execute(
    `INSERT INTO role_permissions (role_id, permission_id) VALUES (?,?) ON CONFLICT DO NOTHING`,
    [ROLE_TEACHER, 'pg6_perm_md_read']
  );

  await ds.execute(
    `INSERT INTO users (id, name, role, email, password_hash, phone, status)
     VALUES (?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`,
    [TEST_ADMIN_ID, 'PG6 Admin', 'admin', TEST_ADMIN_EMAIL, hash, '+0000000000', 'active']
  );
  await ds.execute(
    `INSERT INTO users (id, name, role, email, password_hash, phone, status)
     VALUES (?,?,?,?,?,?,?) ON CONFLICT (id) DO NOTHING`,
    [TEST_TEACHER_ID, 'PG6 Teacher', 'teacher', TEST_TEACHER_EMAIL, hash, '+0000000000', 'active']
  );

  await ds.execute(
    `INSERT INTO user_roles (user_id, role_id) VALUES (?,?) ON CONFLICT DO NOTHING`,
    [TEST_ADMIN_ID, ROLE_ADMIN]
  );
  await ds.execute(
    `INSERT INTO user_roles (user_id, role_id) VALUES (?,?) ON CONFLICT DO NOTHING`,
    [TEST_TEACHER_ID, ROLE_TEACHER]
  );
}

export async function clearRbacTestData(ds: IDataSource): Promise<void> {
  await ds.execute(`DELETE FROM user_roles WHERE user_id IN (?,?)`, [TEST_ADMIN_ID, TEST_TEACHER_ID]);
  await ds.execute(`DELETE FROM users WHERE id IN (?,?)`, [TEST_ADMIN_ID, TEST_TEACHER_ID]);
  await ds.execute(
    `DELETE FROM role_permissions WHERE role_id IN (?,?)`,
    [ROLE_ADMIN, ROLE_TEACHER]
  );
  await ds.execute(`DELETE FROM permissions WHERE id LIKE ?`, ['pg6_perm_md_%']);
  await ds.execute(`DELETE FROM roles WHERE id IN (?,?)`, [ROLE_ADMIN, ROLE_TEACHER]);
}
