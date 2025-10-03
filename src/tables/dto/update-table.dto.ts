import { PartialType } from '@nestjs/mapped-types';
import { CreateTableDto } from './create-table.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTableDto extends PartialType(CreateTableDto) {
    @ApiPropertyOptional({ example: 1, description: 'Table ID (optional for update)' })
    id?: number;
}
