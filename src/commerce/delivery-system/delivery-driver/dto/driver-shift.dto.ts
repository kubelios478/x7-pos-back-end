//src/commerce/delivery-system/delivery-driver/dto/driver-shift.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class DriverShiftDto {
  @ApiProperty({
    example: true,
    description: 'true → active (on shift), false → off_duty',
  })
  @IsBoolean()
  on_shift: boolean;
}
