import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'onboarding_sessions' })
export class OnboardingSession {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'int', default: 1 })
  step: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  selectedTierId?: string | null;

  @Column({ type: 'int', nullable: true })
  planId?: number | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  legalBusinessName?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  taxId?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  primaryIndustry?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  registeredAddress?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  state?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  zipCode?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  merchantName?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  merchantEmail?: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  merchantPhone?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  merchantAddress?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  merchantCity?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  merchantState?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  merchantCountry?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  firstName?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  lastName?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  jobTitle?: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  workEmail?: string | null;

  @Column({ type: 'boolean', default: false })
  termsAccepted: boolean;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
