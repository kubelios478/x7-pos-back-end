import { ApiProperty } from '@nestjs/swagger';

export class SuscriptionPlanResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Basic Plan' })
  name: string;

  @ApiProperty({ example: 'Acceso limitado a funcionalidades' })
  description: string;

  @ApiProperty({ example: 9.99 })
  price: number;

  @ApiProperty({ example: 'monthly' })
  billingCycle: string;

  @ApiProperty({ example: 'active' })
  status: string;
}
