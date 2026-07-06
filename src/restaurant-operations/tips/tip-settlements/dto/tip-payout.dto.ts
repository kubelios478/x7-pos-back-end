import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, Min, ValidateNested } from 'class-validator';

export class TipPayoutPaymentDto {
  @ApiProperty({ example: 1, description: 'ID of the collaborator receiving the tip' })
  @IsNumber()
  @IsNotEmpty()
  collaboratorId: number;

  @ApiProperty({ example: 25.50, description: 'Tip amount allocated', minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class TipPayoutDto {
  @ApiProperty({
    type: [TipPayoutPaymentDto],
    description: 'Detailed list of payments per collaborator',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TipPayoutPaymentDto)
  payments: TipPayoutPaymentDto[];
}
