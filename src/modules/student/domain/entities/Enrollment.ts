export interface EnrollmentProps {
  id: string;
  studentId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  status: string;
}

export class Enrollment {
  public readonly id: string;
  public readonly studentId: string;
  public readonly academicYearId: string;
  public readonly classId: string;
  public readonly sectionId: string;
  public readonly status: string;

  constructor(props: EnrollmentProps) {
    if (!props.id.trim() || !props.studentId.trim() || !props.academicYearId.trim() || !props.classId.trim() || !props.sectionId.trim()) {
      throw new Error('Enrollment requires id, studentId, academicYearId, classId, and sectionId.');
    }
    this.id = props.id.trim();
    this.studentId = props.studentId.trim();
    this.academicYearId = props.academicYearId.trim();
    this.classId = props.classId.trim();
    this.sectionId = props.sectionId.trim();
    this.status = props.status.trim();
    Object.freeze(this);
  }
}
