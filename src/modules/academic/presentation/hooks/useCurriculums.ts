/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * State-management hook for Curriculum CRUD via the real Academic REST API.
 */

import { useCallback, useEffect, useState } from 'react';
import { curriculumApi } from '../api/academicApiClient';
import { CurriculumApi, SaveCurriculumPayload } from '../types';

export function useCurriculums() {
  const [items, setItems] = useState<CurriculumApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await curriculumApi.list();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطأ في جلب المناهج الدراسية');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const save = useCallback(
    async (payload: SaveCurriculumPayload, isEdit: boolean) => {
      setActionLoading(true);
      setError(null);
      try {
        isEdit ? await curriculumApi.update(payload.id, payload) : await curriculumApi.save(payload);
        await fetchItems();
        return { success: true as const };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في حفظ المنهج الدراسي';
        setError(message);
        return { success: false as const, error: message };
      } finally {
        setActionLoading(false);
      }
    },
    [fetchItems],
  );

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await curriculumApi.delete(id);
        await fetchItems();
        return { success: true as const };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في حذف المنهج الدراسي';
        setError(message);
        return { success: false as const, error: message };
      }
    },
    [fetchItems],
  );

  return { items, isLoading, actionLoading, error, fetchItems, save, remove };
}
