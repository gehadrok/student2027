import { NotImplementedError } from '../../domain/exceptions/NotImplementedError';
import { GraduateStudentCommand, RegisterStudentCommand, SuspendStudentCommand, TransferStudentCommand } from '../commands';
import { EnrollStudentCommand } from '../commands/EnrollStudentCommand';
import { StudentDto } from '../dto/StudentDto';

export class StudentApplicationService {
  register(_command: RegisterStudentCommand): Promise<StudentDto> {
    throw new NotImplementedError();
  }

  enroll(_command: EnrollStudentCommand): Promise<StudentDto> {
    throw new NotImplementedError();
  }

  transfer(_command: TransferStudentCommand): Promise<StudentDto> {
    throw new NotImplementedError();
  }

  graduate(_command: GraduateStudentCommand): Promise<StudentDto> {
    throw new NotImplementedError();
  }

  suspend(_command: SuspendStudentCommand): Promise<StudentDto> {
    throw new NotImplementedError();
  }
}
