import { PartialType } from '@nestjs/swagger';
import { CreateQROrderDto } from './create-qr-order.dto';

export class UpdateQROrderDto extends PartialType(CreateQROrderDto) {}
