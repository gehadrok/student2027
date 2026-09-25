/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-6 — Authentication API router (mounted at /api/auth).
 *
 * Endpoints (no auth required except where noted):
 *   POST /api/auth/login    — verify credentials server-side, issue JWT
 *   POST /api/auth/refresh  — re-issue JWT from a valid token (authenticated)
 *   GET  /api/auth/profile  — current user profile + permissions (authenticated)
 *   POST /api/auth/logout   — discard session (authenticated; stateless)
 *
 * SECURITY:
 *   - password_hash is NEVER selected into the response.
 *   - credentials are verified server-side via AuthService (HashService).
 *   - password is never logged.
 */
import { Router, Request, Response } from 'express';
import { DataSourceFactory } from '../datasource/DataSourceFactory';
import { AuthService } from './AuthService';
import { HashService } from '../security/HashService';
import { getTokenService, authenticate, AuthRequest } from './authMiddleware';
import { RbacService } from './RbacService';

function makeAuthService(): AuthService {
  return new AuthService(DataSourceFactory.getInstance(), new HashService(), getTokenService());
}

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/login', async (req: Request, res: Response) => {
    const body = req.body || {};
    const email = typeof body.email === 'string' ? body.email : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!email || !password) {
      return res.status(400).json({ error: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const result = await makeAuthService().login({ email, password });
    if (!result.success) {
      // Safe error: generic message, no distinction between unknown user / bad password.
      return res.status(401).json({ error: result.error || 'فشل تسجيل الدخول' });
    }

    return res.status(200).json({
      token: result.token,
      user: {
        id: result.userId,
        name: result.name,
        email: result.email,
        role: result.role,
      },
    });
  });

  router.post('/refresh', authenticate, (req: AuthRequest, res: Response) => {
    const u = req.user!;
    const token = getTokenService().generate({
      userId: u.userId,
      role: u.role,
      email: u.email,
      name: u.name,
    });
    return res.status(200).json({ token });
  });

  router.get('/profile', authenticate, (req: AuthRequest, res: Response) => {
    const u = req.user!;
    const ds = DataSourceFactory.getInstance();
    ds.query<any>(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [u.userId]
    )
      .then(async (rows) => {
        if (!rows.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
        const row = rows[0];
        const perms = await new RbacService(ds).getUserPermissions(u.userId);
        return res.status(200).json({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          status: row.status,
          permissions: perms.map((p) => p.code),
        });
      })
      .catch(() => res.status(500).json({ error: 'تعذر تحميل الملف الشخصي' }));
  });

  router.post('/logout', authenticate, (_req: AuthRequest, res: Response) => {
    // Stateless JWT: no server-side revocation in this phase. Client discards the token..
    return res.status(200).json({ success: true });
  });

  return router;
}

export default createAuthRouter;
