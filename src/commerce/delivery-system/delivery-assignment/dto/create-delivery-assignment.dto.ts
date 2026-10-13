//src/commerce/delivery-system/delivery-assignment/dto/create-delivery-assignment.dto.ts
//
// `delivery_status` y los timestamps (assigned_at, picked_up_at, delivered_at) ya NO se
// aceptan: los fija el servidor según el ciclo de vida. Con `forbidNonWhitelisted` enviarlos
// devuelve 400.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { AssignmentType } from '../constants/assignment-type.enum';

export class CreateDeliveryAssignmentDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Order' })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  order: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Identifier of an ACTIVE Delivery Driver (IN_HOUSE only). With a driver the assignment starts as ASSIGNED; without one it starts as PENDING.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  deliveryDriver?: number;

  @ApiPropertyOptional({
    enum: AssignmentType,
    default: AssignmentType.IN_HOUSE,
    description: 'In-house driver or third-party DSP',
  })
  @IsOptional()
  @IsEnum(AssignmentType)
  assignment_type?: AssignmentType;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-dsp',
    description: 'Delivery id at the DSP (DSP assignments only)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  external_delivery_id?: string;

  @ApiPropertyOptional({
    example: 'https://track.example.com/a1b2c3d4',
    description: 'HTTPS tracking URL from the DSP (DSP assignments only)',
  })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  external_tracking_url?: string;

  @ApiPropertyOptional({
    example: 7.5,
    description: 'Fee charged by the DSP (DSP assignments only)',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  external_dsp_fee?: number;

  @ApiPropertyOptional({
    example: 'active',
    default: 'active',
    description: 'Logical status of the record',
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive'])
  status?: string;
}
