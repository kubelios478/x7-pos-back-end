import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RealtimeTestBroadcastDto {
  @ApiProperty({
    example: 'test.notification',
    description:
      'Socket.IO event name to emit. Defaults to "test.notification".',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  event?: string;

  @ApiProperty({
    example: 'Hello from realtime test endpoint',
    description: 'Message payload to send to the company room.',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

