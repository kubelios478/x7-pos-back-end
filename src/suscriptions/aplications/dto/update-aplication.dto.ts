//src/suscriptions/aplications/dto/update-aplication.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateAplicationDto } from './create-aplication.dto';
export class UpdateAplicationDto extends PartialType(CreateAplicationDto) {}
