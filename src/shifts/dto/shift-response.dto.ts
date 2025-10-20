import { ApiProperty } from '@nestjs/swagger';
import { ShiftRole } from '../constants/shift-role.enum';

export class ShiftResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Shift' })
  id: number;

  @ApiProperty({ example: 1, description: 'Merchant ID associated with the shift' })
  merchantId: number;

  @ApiProperty({ 
    example: '2024-01-15T08:00:00Z', 
    description: 'Start time of the shift' 
  })
  startTime: Date;

  @ApiProperty({ 
    example: '2024-01-15T16:00:00Z', 
    description: 'End time of the shift' 
  })
  endTime?: Date;

  @ApiProperty({ 
    enum: ShiftRole,
    example: ShiftRole.WAITER,
    description: 'Role of the person working the shift' 
  })
  role: ShiftRole;

  @ApiProperty({ 
    example: '2024-01-15T10:30:00Z', 
    description: 'Date when the shift was created' 
  })
  createdAt: Date;

  @ApiProperty({ 
    example: '2024-01-15T10:30:00Z', 
    description: 'Date when the shift was last updated' 
  })
  updatedAt: Date;
}

