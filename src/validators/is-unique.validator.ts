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
    ignoreIdField?: string; // opcional: para excluir el registro actual
}

@ValidatorConstraint({ name: 'IsCompositeUnique', async: true })
@Injectable()
export class IsUnique implements ValidatorConstraintInterface {
    constructor(private readonly entityManager: EntityManager) { }

    async validate(_: any, args: ValidationArguments): Promise<boolean> {
        const object = args.object as Record<string, any>;
        console.log('object', object);
        const [config] = args.constraints as [CompositeUniqueConfig];
        console.log('config', config);
        const where: Record<string, any> = {};
        console.log('where', where);
        for (const field of config.fields) {
            if (object[field] === undefined) return false;
            console.log('field', field);
            where[field] = object[field];
            console.log('where', where);
        }
        console.log('where', where);
        const query = this.entityManager
            .getRepository(config.entity)
            .createQueryBuilder('entity')
            .where(where);
        console.log('query', query);
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
        return `Ya existe un registro con los valores combinados de: ${fields}`;
    }
}



/*import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@ValidatorConstraint({ name: 'IsUniqueTableNamePerMerchant', async: true })
@Injectable()
export class IsUnique implements ValidatorConstraintInterface {
    constructor(private readonly entityManager: EntityManager) { }

    async validate(number: string, args: ValidationArguments): Promise<boolean> {
        const object = args.object as any;
        const merchantId = object.merchant_id;

        if (!merchantId || !number) return false;

        const exists = await this.entityManager
            .getRepository('table')
            .createQueryBuilder('table')
            .where('table.number = :number', { number })
            .andWhere('table.merchant_id = :merchantId', { merchantId })
            .getExists();

        return !exists;
    }

    defaultMessage(args: ValidationArguments): string {
        return `Ya existe una mesa con el nombre "${args.value}" para este merchant`;
    }
}
*/

/*import {
    ValidatorConstraint,
    ValidatorConstraintInterface,
    ValidationArguments,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@ValidatorConstraint({ name: 'IsUniqueConstraint', async: true })
@Injectable()
export class IsUnique implements ValidatorConstraintInterface {
    constructor(private readonly entityManager: EntityManager) { }

    async validate(value: any, args?: ValidationArguments): Promise<boolean> {
        const [tableName, column] = args?.constraints as string[];
        const exists = await this.entityManager
            .getRepository(tableName)
            .createQueryBuilder(tableName)
            .where({ [column]: value })
            .getExists();

        return !exists;
    }

    defaultMessage(args: ValidationArguments): string {
        return `${args.property} ya está en uso`;
    }
}
*/