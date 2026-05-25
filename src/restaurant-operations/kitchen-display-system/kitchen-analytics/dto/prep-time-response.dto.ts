import { ApiProperty } from '@nestjs/swagger';

export class PrepTimeItemDto {
  @ApiProperty({ example: 1 })
  categoryId: number;

  @ApiProperty({ example: 2 })
  stationId: number;

  @ApiProperty({ example: 5 })
  dayOfWeek: number;

  @ApiProperty({ example: 13 })
  hourOfDay: number;

  @ApiProperty({ example: 420 })
  avgPrepTimeSeconds: number;
}

export class PrepTimeResponseDto {
  @ApiProperty({ type: [PrepTimeItemDto] })
  data: PrepTimeItemDto[];
}
