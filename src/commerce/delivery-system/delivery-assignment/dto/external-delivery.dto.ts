//src/commerce/delivery-system/delivery-assignment/dto/external-delivery.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  AssignmentType,
  DSP_ASSIGNMENT_TYPES,
} from '../constants/assignment-type.enum';

export class ExternalQuoteDto {
  @ApiProperty({ example: 1, description: 'Identifier of the delivery Order' })
  @IsInt()
  @Min(1)
  order_id: number;

  @ApiProperty({
    enum: DSP_ASSIGNMENT_TYPES,
    example: AssignmentType.DOORDASH_DRIVE,
  })
  @IsIn(DSP_ASSIGNMENT_TYPES)
  provider: AssignmentType;
}

export class ExternalDispatchDto extends ExternalQuoteDto {
  @ApiPropertyOptional({
    example: 'q_123',
    description:
      'Quote accepted by the merchant, when the provider uses quotes',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  quote_id?: string;
}
