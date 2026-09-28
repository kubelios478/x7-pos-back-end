import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class DepleteFromOrderDto {
  @ApiProperty({
    example: 42,
    description: 'Unique identifier of the sales order to deplete stock from',
  })
  @IsNotEmpty()
  @IsInt()
  orderId: number;
}
