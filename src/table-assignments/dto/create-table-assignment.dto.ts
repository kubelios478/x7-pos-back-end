import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateTableAssignmentDto {
  @ApiProperty({ 
    example: 1, 
    description: 'ID of the shift this assignment belongs to' 
  })
  @IsNumber()
  @IsNotEmpty()
  shiftId: number;

  @ApiProperty({ 
    example: 1, 
    description: 'ID of the table being assigned' 
  })
  @IsNumber()
  @IsNotEmpty()
  tableId: number;

  @ApiProperty({ 
    example: 1, 
    description: 'ID of the collaborator assigned to the table' 
  })
  @IsNumber()
  @IsNotEmpty()
  collaboratorId: number;

  @ApiProperty({ 
    example: '2024-01-15T16:00:00Z', 
    description: 'Timestamp when the table was released',
    required: false
  })
  @IsDateString()
  @IsOptional()
  releasedAt?: string;
}