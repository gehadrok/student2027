import { NotImplementedError } from '../../domain/exceptions/NotImplementedError';

export function useEnrollment(): never {
  throw new NotImplementedError();
}
