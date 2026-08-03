import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateLedgerAccountDto } from './create-ledger-account.dto';

export class UpdateLedgerAccountDto extends PartialType(
  CreateLedgerAccountDto,
) {
  @ApiPropertyOptional({
    example: true,
    description: 'Set to true to reactivate a previously deactivated account',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
