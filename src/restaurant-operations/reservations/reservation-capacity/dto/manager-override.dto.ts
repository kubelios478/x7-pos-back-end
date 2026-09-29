import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Credenciales del ENCARGADO que autoriza a forzar una franja llena. No son las de quien
 * está logueado: la anfitriona reserva y el encargado, a su lado, teclea las suyas. El
 * servidor las verifica (bcrypt) y exige que sea MERCHANT_ADMIN activo del mismo comercio.
 */
export class ManagerOverrideDto {
  @ApiProperty({ example: 'manager@restaurant.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  @ApiProperty({ example: 'S3cret!', format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string;
}
