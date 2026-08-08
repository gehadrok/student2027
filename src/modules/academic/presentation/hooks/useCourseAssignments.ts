/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * State-management hook for CourseAssignment CRUD via the real Academic REST API.
 */

import { useCallback, useEffect, useState } from 'react';
import { courseAssignmentApi } from '../api/academicApiClient';
import { CourseAssignmentApi, SaveCourseAssignmentPayload } from '../types';

export function useCourseAssignments() {
  const [items, setItems] = useState<CourseAssignmentApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await courseAssignmentApi.list();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطأ في جلب التكليفات الدراسية');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const save = useCallback(
    async (payload: SaveCourseAssignmentPayload, isEdit: boolean) => {
      setActionLoading(true);
      setError(null);
      try {
        isEdit ? await courseAssignmentApi.update(payload.id, payload) : await courseAssignmentApi.save(payload);
        await fetchItems();
        return { success: true as const };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في حفظ التكليف الدراسي';
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
        await courseAssignmentApi.delete(id);
        await fetchItems();
        return { success: true as const };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في حذف التكليف الدراسي';
        setError(message);
        return { success: false as const, error: message };
      }
    },
    [fetchItems],
  );

  return { items, isLoading, actionLoading, error, fetchItems, save, remove };
}
