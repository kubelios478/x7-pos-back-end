import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsBoolean, IsOptional } from 'class-validator';

export class CreateLocationDto {
  @ApiProperty({ example: 'New York', description: 'Location name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: '123 Main St', description: 'Location address' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiProperty({ example: true, description: 'Is location active', required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
