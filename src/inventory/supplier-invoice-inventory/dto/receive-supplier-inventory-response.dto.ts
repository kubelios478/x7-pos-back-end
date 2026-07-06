import { ApiProperty } from '@nestjs/swagger';

export class ReceiveSupplierInventoryLineResultDto {
  @ApiProperty()
  invoiceItemId: number;

  @ApiProperty()
  stockItemId: number;

  @ApiProperty()
  productId: number;

  @ApiProperty()
  variantId: number;

  @ApiProperty()
  previousQty: number;

  @ApiProperty()
  newQty: number;

  @ApiProperty({ nullable: true })
  previousWacc: number | null;

  @ApiProperty()
  newWacc: number;

  @ApiProperty()
  movementId: number;
}

export class ReceiveSupplierInventoryResponseDto {
  @ApiProperty()
  invoiceId: number;

  @ApiProperty()
  locationId: number;

  @ApiProperty({ type: [ReceiveSupplierInventoryLineResultDto] })
  lines: ReceiveSupplierInventoryLineResultDto[];
}
