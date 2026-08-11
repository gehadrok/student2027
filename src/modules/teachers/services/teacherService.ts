import { teacherRepository } from '../repository/teacherRepository';
import { Teacher } from '../../../types';
import { TeacherFilter } from '../types';

export class TeacherService {
  async getFilteredTeachers(filter: TeacherFilter): Promise<Teacher[]> {
    let teachers = await teacherRepository.getAll();

    if (filter.status && filter.status !== 'all') {
      teachers = teachers.filter((t) => t.status === filter.status);
    }

    if (filter.specialization && filter.specialization !== 'all') {
      teachers = teachers.filter((t) => t.specialization.includes(filter.specialization!));
    }

    if (filter.searchQuery && filter.searchQuery.trim() !== '') {
      const q = filter.searchQuery.toLowerCase().trim();
      teachers = teachers.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.specialization.toLowerCase().includes(q) ||
          t.phone.includes(q) ||
          t.email.toLowerCase().includes(q)
      );
    }

    return teachers;
  }

  async addTeacher(teacherData: Omit<Teacher, 'id' | 'userId'>): Promise<Teacher> {
    const newTeacher: Teacher = {
      ...teacherData,
      id: 't_' + Date.now().toString(36),
      userId: 'u_tch_' + Date.now().toString(36)
    };
    return teacherRepository.save(newTeacher);
  }

  async updateTeacher(id: string, updateData: Partial<Teacher>): Promise<Teacher | undefined> {
    const existing = await teacherRepository.getById(id);
    if (!existing) return undefined;

    const updated: Teacher = {
      ...existing,
      ...updateData
    };
    return teacherRepository.save(updated);
  }

  async deleteTeacher(id: string): Promise<boolean> {
    return teacherRepository.delete(id);
  }
}

export const teacherService = new TeacherService();
