/**
 * Master Data React Hooks
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { masterDataService } from '../services/masterDataService';
import {
  MasterDataEntity,
  MasterDataFilter,
  PaginatedResult,
  ImportResult,
  ValidationError
} from '../types';
import { DEFAULT_PAGE_SIZE } from '../constants';

/**
 * Hook for managing master data with CRUD + pagination + search
 */
export function useMasterData<T extends MasterDataEntity>(
  entityType: string,
  initialFilter: MasterDataFilter = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MasterDataFilter>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    ...initialFilter
  });

  // Current record for edit
  const [editRecord, setEditRecord] = useState<T | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await masterDataService.getPaginated<T>(entityType, filter);
      setData(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      setError(err.message || 'خطأ في جلب البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [entityType, filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPage = useCallback((page: number) => {
    setFilter(prev => ({ ...prev, page }));
  }, []);

  const setSearchQuery = useCallback((searchQuery: string) => {
    setFilter(prev => ({ ...prev, searchQuery, page: 1 }));
  }, []);

  const setActiveFilter = useCallback((is_active: number | 'all') => {
    setFilter(prev => ({ ...prev, is_active, page: 1 }));
  }, []);

  const openCreateForm = useCallback(() => {
    setEditRecord(null);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((record: T) => {
    setEditRecord(record);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditRecord(null);
  }, []);

  const handleCreate = useCallback(async (formData: Partial<T>): Promise<{ success: boolean; errors: ValidationError[] }> => {
    const existing = await masterDataService.getAll<T>(entityType, false);
    const result = await masterDataService.create(entityType, formData, existing);
    if (result.success) {
      closeForm();
      await fetchData();
    }
    return { success: result.success, errors: result.errors };
  }, [entityType, fetchData, closeForm]);

  const handleUpdate = useCallback(async (formData: Partial<T>): Promise<{ success: boolean; errors: ValidationError[] }> => {
    if (!editRecord) return { success: false, errors: [{ field: 'id', message: 'لا يوجد سجل للتعديل' }] };
    const existing = await masterDataService.getAll<T>(entityType, false);
    const result = await masterDataService.update(entityType, editRecord.id, formData, existing);
    if (result.success) {
      closeForm();
      await fetchData();
    }
    return { success: result.success, errors: result.errors };
  }, [entityType, editRecord, fetchData, closeForm]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await masterDataService.delete(entityType, id);
    if (result.success) {
      setShowDeleteConfirm(null);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await fetchData();
    }
    return result;
  }, [entityType, fetchData]);

  const handleBulkDelete = useCallback(async () => {
    const ids: string[] = Array.from(selectedIds);
    if (ids.length === 0) return { success: 0, failed: 0, errors: [] };
    const result = await masterDataService.bulkDelete(entityType, ids);
    setSelectedIds(new Set());
    await fetchData();
    return result;
  }, [entityType, selectedIds, fetchData]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(d => d.id)));
    }
  }, [data, selectedIds]);

  const importData = useCallback(async (rows: Partial<T>[]): Promise<ImportResult> => {
    const result = await masterDataService.importData(entityType, rows);
    await fetchData();
    return result;
  }, [entityType, fetchData]);

  const exportData = useCallback(async (format: 'excel' | 'csv' | 'pdf' = 'excel') => {
    return masterDataService.exportData<T>({ format, entityType });
  }, [entityType]);

  return {
    // Data
    data,
    total,
    totalPages,
    isLoading,
    error,

    // Filter
    filter,
    setFilter,
    goToPage,
    setSearchQuery,
    setActiveFilter,

    // Selection
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    hasSelection: selectedIds.size > 0,
    selectedCount: selectedIds.size,

    // Form modal
    showForm,
    editRecord,
    openCreateForm,
    openEditForm,
    closeForm,
    handleCreate,
    handleUpdate,

    // Delete
    showDeleteConfirm,
    setShowDeleteConfirm: (id: string | null) => setShowDeleteConfirm(id),
    handleDelete,
    handleBulkDelete,

    // Import / Export
    importData,
    exportData,

    // Refresh
    refetch: fetchData
  };
}

/**
 * Hook to get all records (for dropdowns)
 */
export function useMasterDataLookup<T extends MasterDataEntity>(
  entityType: string,
  activeOnly: boolean = true
) {
  const [records, setRecords] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const result = await masterDataService.getAll<T>(entityType, activeOnly);
        if (!cancelled) setRecords(result);
      } catch {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityType, activeOnly]);

  return { records, isLoading };
}

