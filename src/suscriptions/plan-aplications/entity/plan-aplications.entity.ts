import { AplicationEntity } from 'src/suscriptions/aplications/entity/aplication-entity';
import { SuscriptionPlan } from '../../suscription-plan/entity/suscription-plan.entity';
import { Entity, ManyToOne, JoinColumn, Column, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity({ name: 'plan_aplications' })
export class PlanAplication {
  @ApiProperty({
    example: 1,
    description:
      'Unique identifier of the Subscription Plan related to this Plan-Aplication',
  })
  @PrimaryColumn({ name: 'plan_id', type: 'bigint' })
  planId: number;

  @ApiProperty({
    example: 10,
    description:
      'Unique identifier of the Application related to this Plan-Aplication',
  })
  @PrimaryColumn({ name: 'application_id', type: 'bigint' })
  applicationId: number;

  @ApiProperty({
    example: 'MySuscriptionPlan',
    description: 'Suscription-Plan related with the Plan-Aplication',
  })
  @ManyToOne(() => SuscriptionPlan, { eager: true })
  @JoinColumn({ name: 'suscriptionplan_id' })
  suscriptionplan: SuscriptionPlan;

  @ApiProperty({
    example: 'MyAplication',
    description: 'Aplication related with the Plan-Aplication',
  })
  @ManyToOne(() => AplicationEntity, { eager: true })
  @JoinColumn({ name: 'aplication_id' })
  aplication: AplicationEntity;

  @ApiProperty({
    example: 'Basic usage limit: 100 users per month',
    description:
      'Defines the usage limits or restrictions for the Plan-Aplication',
  })
  @Column({ type: 'varchar', length: 50 })
  limits: string;
}
