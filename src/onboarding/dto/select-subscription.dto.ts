import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SelectSubscriptionDto {
  @ApiProperty({ example: 'professional' })
  @IsString()
  @IsNotEmpty()
  tierId: string;
}
