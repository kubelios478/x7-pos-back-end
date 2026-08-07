// src/core/configuration/company-default/entity/company-default-configuration.entity.ts
import { ChildEntity } from 'typeorm';
import { Configuration } from '../../entity/configuration-entity';

/**
 * Default configuration record auto-seeded when a new company is provisioned.
 * It carries no merchant (merchant_id is null) and acts as the company-level
 * seed row for future SaaS parameters. Discriminator: `company_default`.
 */
@ChildEntity({ name: 'company_default' })
export class CompanyDefaultConfiguration extends Configuration {}
