import { NotImplementedError } from '../../domain/exceptions/NotImplementedError';

export function useStudent(): never {
  throw new NotImplementedError();
}
