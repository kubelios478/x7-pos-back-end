//src/platform-saas/subscriptions/dto/my-subscription.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class MySubscriptionPlanDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Pro' })
  name: string;

  @ApiPropertyOptional({ example: 'pro', nullable: true })
  slug?: string | null;

  @ApiProperty({ example: 49.9, nullable: true })
  price: number | null;

  @ApiProperty({ example: 'monthly' })
  billingCycle: string;
}

export class MyCompanySubscriptionDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({
    example: true,
    description:
      'Whether the subscription currently grants access (active and not past endDate)',
  })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-15' })
  startDate: string;

  @ApiProperty({ example: '2026-11-15', nullable: true })
  endDate: string | null;

  @ApiProperty({ example: '2026-11-15', nullable: true })
  renewalDate: string | null;

  @ApiProperty({ example: 'card' })
  paymentMethod: string;

  @ApiProperty({ type: MySubscriptionPlanDto })
  plan: MySubscriptionPlanDto;
}

export class MySubscriptionPaymentDto {
  @ApiProperty({ example: 41 })
  id: number;

  @ApiProperty({ example: 3, nullable: true })
  planId: number | null;

  @ApiProperty({ example: 'Pro', nullable: true })
  planName: string | null;

  @ApiProperty({ example: 49.9 })
  amount: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 'paid', description: 'pending | paid | rejected' })
  status: string;

  @ApiProperty({ example: 'dummy_gateway' })
  paymentMethod: string;

  @ApiProperty({ example: '2026-10-24T15:00:00.000Z' })
  paymentDate: Date;
}

export class MySubscriptionResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Subscription retrieved successfully' })
  message: string;

  @ApiProperty({
    example: {
      subscription: {
        id: 12,
        status: 'active',
        isActive: true,
        startDate: '2026-01-15',
        endDate: '2026-11-15',
        renewalDate: '2026-11-15',
        paymentMethod: 'card',
        plan: {
          id: 3,
          name: 'Pro',
          slug: 'pro',
          price: 49.9,
          billingCycle: 'monthly',
        },
      },
      pendingPayment: null,
    },
  })
  data: {
    subscription: MyCompanySubscriptionDto | null;
    pendingPayment: MySubscriptionPaymentDto | null;
  };
}

export class MySubscriptionPaymentsResponseDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Subscription payments retrieved successfully' })
  message: string;

  @ApiProperty({ type: [MySubscriptionPaymentDto] })
  data: MySubscriptionPaymentDto[];

  @ApiProperty({ example: { page: 1, limit: 10, total: 3, totalPages: 1 } })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class QueryMySubscriptionPaymentsDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
