import { PartialType } from '@nestjs/swagger';
import { CreateInputDto } from './create-input.dto';

export class UpdateInputDto extends PartialType(CreateInputDto) {}
