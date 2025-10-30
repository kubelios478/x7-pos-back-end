//src/subscriptions/applications/dto/create-application.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({ example: 'My Application' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'This is a sample application' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Utility' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive'])
  status: string;
}
