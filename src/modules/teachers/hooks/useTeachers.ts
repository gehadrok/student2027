import { useState, useCallback, useEffect } from 'react';
import { teacherService } from '../services/teacherService';
import { Teacher } from '../../../types';
import { TeacherFilter } from '../types';

export const useTeachers = (initialFilter: TeacherFilter = {}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TeacherFilter>(initialFilter);

  const fetchTeachers = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      setTimeout(() => {
        const data = teacherService.getFilteredTeachers(filter);
        setTeachers(data);
        setIsLoading(false);
      }, 100);
    } catch (err: any) {
      setError(err.message || 'خطأ في جلب بيانات الكادر التعليمي');
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
    addTeacher: (data: Omit<Teacher, 'id' | 'userId'>) => {
      const res = teacherService.addTeacher(data);
      fetchTeachers();
      return res;
    },
    updateTeacher: (id: string, data: Partial<Teacher>) => {
      const res = teacherService.updateTeacher(id, data);
      fetchTeachers();
      return res;
    },
    deleteTeacher: (id: string) => {
      const res = teacherService.deleteTeacher(id);
      fetchTeachers();
      return res;
    }
  };
};
