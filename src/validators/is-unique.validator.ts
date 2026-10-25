import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

interface CompositeUniqueConfig {
  entity: string;
  fields: string[];
  ignoreIdField?: string;
}

@ValidatorConstraint({ name: 'IsCompositeUnique', async: true })
@Injectable()
export class IsUnique implements ValidatorConstraintInterface {
  constructor(private readonly entityManager: EntityManager) {}

  async validate(_: unknown, args: ValidationArguments): Promise<boolean> {
    const object = args.object as Record<string, unknown>;
    const [config] = args.constraints as [CompositeUniqueConfig];
    const where: Record<string, unknown> = {};
    for (const field of config.fields) {
      if (object[field] === undefined) return false;
      where[field] = object[field];
    }
    const query = this.entityManager
      .getRepository(config.entity)
      .createQueryBuilder('entity')
      .where(where);
    if (config.ignoreIdField && object[config.ignoreIdField]) {
      query.andWhere(`entity.${config.ignoreIdField} != :id`, {
        id: object[config.ignoreIdField],
      });
    }

    const exists = await query.getExists();
    return !exists;
  }

  defaultMessage(args: ValidationArguments): string {
    const [config] = args.constraints as [CompositeUniqueConfig];
    const fields = config.fields.join(', ');
    return `A record with the combined values of: ${fields} already exists`;
  }
}
