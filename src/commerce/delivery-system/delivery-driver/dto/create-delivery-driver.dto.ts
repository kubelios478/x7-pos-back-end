//src/commerce/delivery-system/delivery-driver/dto/create-delivery-driver.dto.ts
//
// El comercio sale SIEMPRE del JWT: `merchant` ya no se acepta en el cuerpo (400 con
// forbidNonWhitelisted). `on_delivery` tampoco se puede fijar a mano: sólo lo gestiona el
// flujo de asignaciones.
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  DriverStatus,
  EDITABLE_DRIVER_STATUSES,
  VehicleType,
} from '../constants/delivery-driver.constants';
import {
  normalizePhone,
  normalizeVehicleType,
  PHONE_PATTERN,
} from '../utils/delivery-driver-normalize.util';

export class CreateDeliveryDriverDto {
  @ApiProperty({
    example: 'Mario Lopez',
    description: 'Name of the Delivery Driver',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: '+1 (809) 555-1234',
    description:
      'Phone number; stored normalised (spaces, dashes, dots and parentheses removed, leading + kept), e.g. +18095551234. Unique per merchant.',
    maxLength: 20,
  })
  @Transform(({ value }: { value: unknown }) => normalizePhone(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(PHONE_PATTERN, {
    message:
      'phone must contain 4-19 digits, optionally prefixed by + (spaces, dashes, dots and parentheses are ignored)',
  })
  phone: string;

  // Acepta la etiqueta de la UI ('E-Scooter', 'On Foot'…) en cualquier capitalización o el
  // valor guardado ('e_scooter'); se guarda siempre el valor canónico.
  @ApiProperty({
    enum: VehicleType,
    example: VehicleType.CAR,
    description:
      'car | motorcycle | bicycle | e_scooter | on_foot (labels such as "E-Scooter" or "On Foot" are accepted case-insensitively)',
  })
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : (normalizeVehicleType(value) ?? value),
  )
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ApiPropertyOptional({
    enum: EDITABLE_DRIVER_STATUSES,
    default: DriverStatus.ACTIVE,
    description:
      'active | inactive | off_duty (on_delivery is managed by the assignment flow)',
  })
  @IsOptional()
  @IsString()
  @IsIn([...EDITABLE_DRIVER_STATUSES], {
    message:
      'status must be one of: active, inactive, off_duty (on_delivery is set only by the assignment flow)',
  })
  status?: string;
}
