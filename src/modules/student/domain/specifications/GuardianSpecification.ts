import { GuardianLink } from '../entities/GuardianLink';
import { NotImplementedError } from '../exceptions/NotImplementedError';
import { Specification } from './Specification';

export class GuardianSpecification implements Specification<GuardianLink> {
  isSatisfiedBy(_candidate: GuardianLink): boolean {
    throw new NotImplementedError();
  }
}
