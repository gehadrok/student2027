import { useState, useCallback, useEffect } from 'react';
import { studentService } from '../services/studentService';
import { Student } from '../../../types';
import { StudentFilter } from '../types';

export const useStudents = (initialFilter: StudentFilter = {}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StudentFilter>(initialFilter);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await studentService.getFilteredStudents(filter);
      setStudents(data);
    } catch (err: any) {
      setError(err.message || 'خطأ في جلب بيانات الطلاب');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    isLoading,
    error,
    filter,
    setFilter,
    refetch: fetchStudents,
    addStudent: async (data: Omit<Student, 'id' | 'userId'>) => {
      const res = await studentService.addStudent(data);
      await fetchStudents();
      return res;
    },
    updateStudent: async (id: string, data: Partial<Student>) => {
      const res = await studentService.updateStudent(id, data);
      await fetchStudents();
      return res;
    },
    deleteStudent: async (id: string) => {
      const res = await studentService.deleteStudent(id);
      await fetchStudents();
      return res;
    }
  };
};
