/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * C3.1 — Real implementation of the operational read ports.
 * Calls the C3.1 GET endpoints through the shared ApiClient.
 */

import { apiClient } from '../../../lib/api';
import { ApiError } from '../../../lib/api/errors';
import { MasterDataContractError } from '../../master-data/api/masterDataRestRepository';
import {
  OPERATIONAL_READ_PATHS,
  normalizePageQuery,
  type OperationalListQuery,
  type OperationalPage,
  type OperationalReadPort,
  type OperationalRecordView,
  type OperationalResourceKey,
} from './operationalReadPort';

type OperationalClient = Pick<typeof apiClient, 'get'>;

function assertPage(value: unknown): asserts value is OperationalPage<OperationalRecordView> {
  if (!value || typeof value !== 'object' || !Array.isArray((value as any).data) || typeof (value as any).total !== 'number') {
    throw new MasterDataContractError('استجابة Kayan لا تطابق عقد القائمة { data, total, page, pageSize, totalPages }');
  }
}

export function createOperationalRestReadPort(client: OperationalClient = apiClient): OperationalReadPort {
  return {
    async list<T = OperationalRecordView>(
      resource: OperationalResourceKey,
      query: OperationalListQuery = {},
    ): Promise<OperationalPage<T>> {
      const normalized = normalizePageQuery(query);
      const payload = await client.get<OperationalPage<T>>(OPERATIONAL_READ_PATHS[resource], { query: normalized as any });
      assertPage(payload);
      return payload;
    },

    async getById<T = OperationalRecordView>(resource: OperationalResourceKey, id: string): Promise<T> {
      if (!id) throw new RangeError('id is required');
      return client.get<T>(`${OPERATIONAL_READ_PATHS[resource]}/${encodeURIComponent(id)}`);
    },
  };
}

export const operationalRestReadPort: OperationalReadPort = createOperationalRestReadPort();

export function isOperationalAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.isUnauthorized || error.isForbidden);
}
