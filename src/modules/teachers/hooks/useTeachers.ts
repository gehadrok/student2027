import { useState, useCallback, useEffect } from 'react';
import { teacherService } from '../services/teacherService';
import { Teacher } from '../../../types';
import { TeacherFilter } from '../types';

export const useTeachers = (initialFilter: TeacherFilter = {}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TeacherFilter>(initialFilter);

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await teacherService.getFilteredTeachers(filter);
      setTeachers(data);
    } catch (err: any) {
      setError(err.message || 'خطأ في جلب بيانات الكادر التعليمي');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  return {
    teachers,
    isLoading,
    error,
    filter,
    setFilter,
    refetch: fetchTeachers,
    addTeacher: async (data: Omit<Teacher, 'id' | 'userId'>) => {
      const res = await teacherService.addTeacher(data);
      await fetchTeachers();
      return res;
    },
    updateTeacher: async (id: string, data: Partial<Teacher>) => {
      const res = await teacherService.updateTeacher(id, data);
      await fetchTeachers();
      return res;
    },
    deleteTeacher: async (id: string) => {
      const res = await teacherService.deleteTeacher(id);
      await fetchTeachers();
      return res;
    }
  };
};
