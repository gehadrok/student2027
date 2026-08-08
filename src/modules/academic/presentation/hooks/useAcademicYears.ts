/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 6.2 — Academic Frontend Integration.
 *
 * State-management hook for Academic Years + Academic Terms lifecycle.
 * Consumes the real Academic REST API via academicApiClient. Handles
 * loading / empty / error states and surfaces backend errors.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  academicYearApi,
  AcademicApiError,
} from '../api/academicApiClient';
import {
  AcademicYearApi,
  AcademicYearSummaryApi,
  CreateAcademicYearPayload,
  AddAcademicTermPayload,
} from '../types';

export function useAcademicYears() {
  const [years, setYears] = useState<AcademicYearSummaryApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [activeYear, setActiveYear] = useState<AcademicYearApi | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchYears = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await academicYearApi.list();
      setYears(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطأ في جلب السنوات الدراسية');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  const fetchYearDetail = useCallback(async (id: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const data = await academicYearApi.getById(id);
      setActiveYear(data);
      setActiveYearId(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'خطأ في تحميل تفاصيل السنة الدراسية');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const create = useCallback(
    async (payload: CreateAcademicYearPayload) => {
      setActionLoading(true);
      setError(null);
      try {
        const created = await academicYearApi.create(payload);
        await fetchYears();
        setActiveYear(created);
        setActiveYearId(created.id);
        return { success: true as const, data: created };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في إنشاء السنة الدراسية';
        setError(message);
        return { success: false as const, error: message };
      } finally {
        setActionLoading(false);
      }
    },
    [fetchYears],
  );

  const createWithTerms = useCallback(
    async (year: CreateAcademicYearPayload, terms: AddAcademicTermPayload[]) => {
      setActionLoading(true);
      setError(null);
      try {
        const created = await academicYearApi.createWithTerms({ year, terms });
        await fetchYears();
        setActiveYear(created);
        setActiveYearId(created.id);
        return { success: true as const, data: created };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في إنشاء السنة الدراسية بفصولها';
        setError(message);
        return { success: false as const, error: message };
      } finally {
        setActionLoading(false);
      }
    },
    [fetchYears],
  );

  const addTerm = useCallback(
    async (yearId: string, payload: AddAcademicTermPayload) => {
      setError(null);
      try {
        const updated = await academicYearApi.addTerm(yearId, payload);
        setActiveYear(updated);
        await fetchYears();
        return { success: true as const, data: updated };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في إضافة الفصل الدراسي';
        setError(message);
        return { success: false as const, error: message };
      }
    },
    [fetchYears],
  );

  const runLifecycle = useCallback(
    async (
      yearId: string,
      action: 'approve' | 'activate' | 'close' | 'archive',
      changedBy: string,
      reason?: string,
    ) => {
      setActionLoading(true);
      setError(null);
      try {
        let updated: AcademicYearApi;
        const payload = { changedBy, reason };
        switch (action) {
          case 'approve':
            updated = await academicYearApi.approve(yearId, payload);
            break;
          case 'activate':
            updated = await academicYearApi.activate(yearId, payload);
            break;
          case 'close':
            updated = await academicYearApi.close(yearId, payload);
            break;
          case 'archive':
            updated = await academicYearApi.archive(yearId, payload);
            break;
        }
        setActiveYear(updated);
        await fetchYears();
        return { success: true as const, data: updated };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في تنفيذ الإجراء على السنة الدراسية';
        setError(message);
        return { success: false as const, error: message, status: err instanceof AcademicApiError ? err.status : undefined };
      } finally {
        setActionLoading(false);
      }
    },
    [fetchYears],
  );

  const runTermAction = useCallback(
    async (
      yearId: string,
      termId: string,
      action: 'open' | 'lock' | 'close',
      changedBy: string,
    ) => {
      setError(null);
      try {
        let updated: AcademicYearApi;
        const payload = { changedBy };
        switch (action) {
          case 'open':
            updated = await academicYearApi.openTerm(yearId, termId, payload);
            break;
          case 'lock':
            updated = await academicYearApi.lockTerm(yearId, termId, payload);
            break;
          case 'close':
            updated = await academicYearApi.closeTerm(yearId, termId, payload);
            break;
        }
        setActiveYear(updated);
        await fetchYears();
        return { success: true as const, data: updated };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'خطأ في تنفيذ الإجراء على الفصل الدراسي';
        setError(message);
        return { success: false as const, error: message, status: err instanceof AcademicApiError ? err.status : undefined };
      }
    },
    [fetchYears],
  );

  const remove = useCallback(async (yearId: string) => {
    setError(null);
    try {
      await academicYearApi.delete(yearId);
      if (activeYearId === yearId) {
        setActiveYear(null);
        setActiveYearId(null);
      }
      await fetchYears();
      return { success: true as const };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطأ في حذف السنة الدراسية';
      setError(message);
      return { success: false as const, error: message };
    }
  }, [fetchYears, activeYearId]);

  return {
    years,
    activeYear,
    activeYearId,
    isLoading,
    actionLoading,
    error,
    fetchYears,
    fetchYearDetail,
    create,
    createWithTerms,
    addTerm,
    runLifecycle,
    runTermAction,
    remove,
  };
}
