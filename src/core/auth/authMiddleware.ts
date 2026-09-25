/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { DataSourceFactory } from '../datasource/DataSourceFactory';
import { TokenService, TokenPayload } from '../security/TokenService';
import { RbacService } from './RbacService';
import { LoggerFactory } from '../logging/LoggerFactory';

const logger = LoggerFactory.getInstance('AuthMiddleware');

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

// Singleton token service built from the environment secret.
let tokenServiceSingleton: TokenService | null = null;
export function getTokenService(): TokenService {
  if (!tokenServiceSingleton) {
    tokenServiceSingleton = new TokenService(process.env.AUTH_SECRET, Number(process.env.AUTH_EXPIRY_MINUTES) || 60);
  }
  return tokenServiceSingleton;
}

/**
 * Authenticate: require a valid Bearer token. On success, attach the decoded
 * payload to `req.user`. Returns 401 otherwise.
 */
export const authenticate: RequestHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح: رمز الوصول مفقود' });
  }
  const payload = await getTokenService().verify(header.slice(7));
  if (!payload) {
    return res.status(401).json({ error: 'غير مصرح: رمز الوصول غير صالح أو منتهٍ' });
  }
  req.user = payload;
  next();
};

/**
 * Build a per-route permission guard. Authenticated but lacking the
 * (resource, action) permission => 403. (401 is handled by `authenticate`.)
 */
export function requirePermission(resource: string, action: string): RequestHandler {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    try {
      const ds = DataSourceFactory.getInstance();
      const rbac = new RbacService(ds);
      const perms = await rbac.getUserPermissions(user.userId);
      if (!rbac.hasPermission(perms, resource, action)) {
        logger.warn(`Permission denied: user=${user.userId} needs ${resource}:${action}`);
        return res.status(403).json({ error: 'ممنوع: لا تملك الصلاحية الكافية' });
      }
      next();
    } catch (err) {
      logger.error('RBAC evaluation failed:', err);
      return res.status(500).json({ error: 'تعذر تقييم الصلاحية' });
    }
  };
}
