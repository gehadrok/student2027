import { useState, useCallback, useEffect } from 'react';
import { studentService } from '../services/studentService';
import { Student } from '../../../types';
import { StudentFilter } from '../types';

export const useStudents = (initialFilter: StudentFilter = {}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StudentFilter>(initialFilter);

  const fetchStudents = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      setTimeout(() => {
        const data = studentService.getFilteredStudents(filter);
        setStudents(data);
        setIsLoading(false);
      }, 100);
    } catch (err: any) {
      setError(err.message || 'خطأ في جلب بيانات الطلاب');
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
    addStudent: (data: Omit<Student, 'id' | 'userId'>) => {
      const res = studentService.addStudent(data);
      fetchStudents();
      return res;
    },
    updateStudent: (id: string, data: Partial<Student>) => {
      const res = studentService.updateStudent(id, data);
      fetchStudents();
      return res;
    },
    deleteStudent: (id: string) => {
      const res = studentService.deleteStudent(id);
      fetchStudents();
      return res;
    }
  };
};
