/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PG-5 — Master Data REST API: HTTP controller (thin adapter).
 *
 * No business logic. Maps request/response ↔ MasterDataApiService, and
 * delegates error formatting to `sendError`. Each handler constructs a
 * fresh service over `DataSourceFactory.getInstance()` so it always uses the
 * currently configured datasource (SQLite by default, PostgreSQL when
 * DATA_SOURCE_TYPE=postgresql — the PG-5 source-of-truth path).
 */
import { Request, Response } from 'express';
import { MasterDataRepository } from '../repository/masterDataRepository';
import { DataSourceFactory } from '../../../core/datasource/DataSourceFactory';
import { MasterDataApiService } from './masterDataApiService';
import { sendError } from './errors';
import { AuthRequest } from '../../../core/auth/authMiddleware';

function service(req: Request): MasterDataApiService {
  const user = (req as AuthRequest).user;
  return new MasterDataApiService(
    new MasterDataRepository(DataSourceFactory.getInstance()),
    user?.userId ?? 'api'
  );
}

export async function listMasterData(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service(req).list(req.params.entityType, req.query as Record<string, any>));
  } catch (err) {
    sendError(res, err);
  }
}

export async function getMasterData(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service(req).get(req.params.entityType, req.params.id));
  } catch (err) {
    sendError(res, err);
  }
}

export async function createMasterData(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json(await service(req).create(req.params.entityType, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export async function updateMasterData(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service(req).update(req.params.entityType, req.params.id, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export async function deleteMasterData(req: Request, res: Response): Promise<void> {
  try {
    await service(req).remove(req.params.entityType, req.params.id);
    res.status(204).send();
  } catch (err) {
    sendError(res, err);
  }
}

export async function bulkCreateMasterData(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json(await service(req).bulkCreate(req.params.entityType, req.body.rows));
  } catch (err) {
    sendError(res, err);
  }
}

export async function bulkDeleteMasterData(req: Request, res: Response): Promise<void> {
  try {
    res.json(await service(req).bulkDelete(req.params.entityType, req.body.ids));
  } catch (err) {
    sendError(res, err);
  }
}
