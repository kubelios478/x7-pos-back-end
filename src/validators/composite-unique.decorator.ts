import { Validate } from 'class-validator';
import { IsUnique } from './is-unique.validator';

export function CompositeUnique(
  entity: string,
  fields: string[],
  ignoreIdField?: string,
) {
  return Validate(IsUnique, [{ entity, fields, ignoreIdField }]);
}
