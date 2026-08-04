import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class UpdateCashDrawerDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Shift for this cash drawer session',
    required: false,
  })
  @IsNumber({}, { message: 'Shift ID must be a valid number' })
  @IsOptional()
  @IsPositive({ message: 'Shift ID must be a positive number' })
  shiftId?: number;

  @ApiProperty({
    example: 100.0,
    description: 'Opening balance amount in the cash drawer',
    required: false,
  })
  @IsNumber({}, { message: 'Opening balance must be a valid number' })
  @IsOptional()
  @Min(0, { message: 'Opening balance must be greater than or equal to 0' })
  openingBalance?: number;

  @ApiProperty({
    example: 150.5,
    description: 'Closing balance amount in the cash drawer',
    required: false,
  })
  @IsNumber({}, { message: 'Closing balance must be a valid number' })
  @IsOptional()
  @Min(0, { message: 'Closing balance must be greater than or equal to 0' })
  closingBalance?: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Collaborator who opened the cash drawer',
    required: false,
  })
  @IsNumber({}, { message: 'Opened by must be a valid number' })
  @IsOptional()
  @IsPositive({ message: 'Opened by must be a positive number' })
  openedBy?: number;

  @ApiProperty({
    example: 2,
    description: 'Identifier of the Collaborator who closed the cash drawer',
    required: false,
  })
  @IsNumber({}, { message: 'Closed by must be a valid number' })
  @IsOptional()
  closedBy?: number;
}
