//src/subscriptions/features/dto/create-feature.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateFeatureDto {
  @ApiProperty({
    example: 'Advanced Analytics',
    description: 'The name of the feature',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Provides advanced data analytics capabilities',
    description: 'A brief description of the feature',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'unit',
    description: 'The billing unit for the feature (e.g., unit, user, gb)',
  })
  @IsString()
  @IsNotEmpty()
  Unit: string;
}
