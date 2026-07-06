import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class ProvisionAccountDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ example: 'Julian' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 80)
  firstName: string;

  @ApiProperty({ example: 'Chen' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 80)
  lastName: string;

  @ApiProperty({ example: 'Operations Director' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  jobTitle: string;

  @ApiProperty({ example: 'admin@restaurant.com' })
  @IsEmail()
  workEmail: string;

  @ApiProperty({ example: 'SecurePass1!' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @Matches(/^(?=.*[A-Z])(?=.*(?:[0-9]|[^A-Za-z0-9])).+$/, {
    message:
      'Password must include an uppercase letter and a number or special character.',
  })
  password: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  @Equals(true, { message: 'Terms of Service and Privacy Policy must be accepted' })
  termsAccepted: boolean;
}

export class AdminIdentityResponseDto {
  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  jobTitle?: string;

  @ApiPropertyOptional()
  workEmail?: string;
}
