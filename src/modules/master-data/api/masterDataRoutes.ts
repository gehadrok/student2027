/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-5 / PG-6 — Master Data REST API router.
 *
 * Mounts the Master Data pilot endpoints under /api/master-data.
 * PG-6: every route is protected by `authenticate` and a per-action
 * `requirePermission(resource='master_data', action)` guard, enforcing the
 * centralized RBAC model with deny-by-default.
 *
 * Bulk sub-routes are registered BEFORE the `:id` param routes so that
 * `/:entityType/bulk` and `/:entityType/bulk-delete` are not captured by
 * the generic `/:entityType/:id` matcher.
 */
import { Router } from 'express';
import * as ctrl from './masterDataController';
import { authenticate, requirePermission } from '../../../core/auth/authMiddleware';

const RESOURCE = 'master_data';

export function createMasterDataRouter(): Router {
  const router = Router();

  // All routes require a valid Bearer token.
  router.use(authenticate);

  // Bulk operations (must precede :id routes)
  router.post('/:entityType/bulk', requirePermission(RESOURCE, 'create'), ctrl.bulkCreateMasterData);
  router.post('/:entityType/bulk-delete', requirePermission(RESOURCE, 'delete'), ctrl.bulkDeleteMasterData);

  // Collection + item lifecycle
  router.get('/:entityType', requirePermission(RESOURCE, 'read'), ctrl.listMasterData);
  router.get('/:entityType/:id', requirePermission(RESOURCE, 'read'), ctrl.getMasterData);
  router.post('/:entityType', requirePermission(RESOURCE, 'create'), ctrl.createMasterData);
  router.put('/:entityType/:id', requirePermission(RESOURCE, 'update'), ctrl.updateMasterData);
  router.delete('/:entityType/:id', requirePermission(RESOURCE, 'delete'), ctrl.deleteMasterData);

  return router;
}

export default createMasterDataRouter;
