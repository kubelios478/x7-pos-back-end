import { ApiProperty } from '@nestjs/swagger';

export class MerchantInfoDto {
  @ApiProperty({ example: 1, description: 'Merchant ID' })
  id: number;

  @ApiProperty({ example: 'Restaurant ABC', description: 'Merchant name' })
  name: string;
}

export class TableResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Table' })
  id: number;

  @ApiProperty({ example: 1, description: 'Merchant ID that owns the table' })
  merchant_id: number;

  @ApiProperty({ example: 'A1', description: 'Table number or identifier' })
  number: string;

  @ApiProperty({ example: 4, description: 'Seating capacity of the Table' })
  capacity: number;

  @ApiProperty({ example: 'available', description: 'Current status of the Table' })
  status: string;

  @ApiProperty({ example: 'Near window', description: 'Location description of the Table' })
  location: string;

  @ApiProperty({ type: MerchantInfoDto, description: 'Basic merchant information' })
  merchant: MerchantInfoDto;
}