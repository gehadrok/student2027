/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * C3.1 — Operational Academic READ router (GET only).
 *
 * Every route is protected by `authenticate` + `requirePermission(<resource>, 'read')`.
 * No POST/PUT/PATCH/DELETE route is registered by this module.
 */

import { Router, type Request, type Response } from 'express';
import { DataSourceFactory } from '../../../core/datasource/DataSourceFactory';
import { authenticate, requirePermission, type AuthRequest } from '../../../core/auth/authMiddleware';
import { sendError } from '../../master-data/api/errors';
import type { UserRole } from '../../types';
import { OperationalApiService } from './operationalApiService';

const READ_RESOURCES = ['student', 'teacher', 'class', 'section', 'subject'] as const;

const RESOURCE_PATHS: Record<(typeof READ_RESOURCES)[number], string> = {
  student: '/students',
  teacher: '/teachers',
  class: '/classes',
  section: '/sections',
  subject: '/subjects',
};

function service(): OperationalApiService {
  return new OperationalApiService(DataSourceFactory.getInstance());
}

function identity(req: AuthRequest): { userId: string; role: UserRole } {
  const user = req.user!;
  return { userId: user.userId, role: user.role as UserRole };
}

function query(req: Request) {
  return {
    page: req.query.page as string | undefined,
    pageSize: req.query.pageSize as string | undefined,
    searchQuery: req.query.searchQuery as string | undefined,
    classId: req.query.classId as string | undefined,
    sectionId: req.query.sectionId as string | undefined,
    status: req.query.status as string | undefined,
    teacherId: req.query.teacherId as string | undefined,
    sortBy: req.query.sortBy as string | undefined,
    sortOrder: req.query.sortOrder as string | undefined,
  };
}

export function createOperationalRouter(): Router {
  const router = Router();
  router.use(authenticate);

  for (const resource of READ_RESOURCES) {
    const base = RESOURCE_PATHS[resource];

    router.get(base, requirePermission(resource, 'read'), async (req: AuthRequest, res: Response) => {
      try {
        res.json(await service().list(resource, identity(req), query(req)));
      } catch (err) {
        sendError(res, err);
      }
    });

    router.get(`${base}/:id`, requirePermission(resource, 'read'), async (req: AuthRequest, res: Response) => {
      try {
        res.json(await service().getById(resource, identity(req), req.params.id));
      } catch (err) {
        sendError(res, err);
      }
    });
  }

  return router;
}

export default createOperationalRouter;
