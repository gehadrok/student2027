import { AcademicYear } from '../aggregates/AcademicYear';
import { AcademicYearId } from '../value-objects/AcademicYearId';
import { AcademicYearCode } from '../value-objects/AcademicYearCode';

/**
 * Repository contract for the AcademicYear aggregate.
 * Persists the aggregate and reconstructs it via rehydrate().
 */
export interface IAcademicYearRepository {
  /**
   * Persist an AcademicYear aggregate (insert or update) inside a UnitOfWork.
   * Dispatches any collected domain events to the EventBus.
   */
  save(year: AcademicYear): Promise<void>;

  /**
   * Find an AcademicYear by its identity.
   */
  findById(id: AcademicYearId): Promise<AcademicYear | null>;

  /**
   * Find an AcademicYear by its unique code.
   */
  findByCode(code: AcademicYearCode): Promise<AcademicYear | null>;

  /**
   * List all persisted AcademicYears.
   */
  getAll(): Promise<AcademicYear[]>;

  /**
   * Delete an AcademicYear by identity.
   */
  delete(id: AcademicYearId): Promise<boolean>;
}
