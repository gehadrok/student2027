/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * State-management hook for AcademicCalendar CRUD via the real Academic REST API.
 */

import { useCallback, useEffect, useState } from 'react';
import { academicCalendarApi } from '../api/academicApiClient';
import { AcademicCalendarApi, SaveAcademicCalendarPayload } from '../types';

export function useAcademicCalendar() {
  const [items, setItems] = useState<AcademicCalendarApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await academicCalendarApi.list();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطأ في جلب التقويم الأكاديمي');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const save = useCallback(
    async (payload: SaveAcademicCalendarPayload, isEdit: boolean) => {
      setActionLoading(true);
      setError(null);
      try {
        isEdit ? await academicCalendarApi.update(payload.id, payload) : await academicCalendarApi.save(payload);
        await fetchItems();
        return { success: true as const };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في حفظ يوم التقويم الأكاديمي';
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
        await academicCalendarApi.delete(id);
        await fetchItems();
        return { success: true as const };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في حذف يوم التقويم الأكاديمي';
        setError(message);
        return { success: false as const, error: message };
      }
    },
    [fetchItems],
  );

  return { items, isLoading, actionLoading, error, fetchItems, save, remove };
}
