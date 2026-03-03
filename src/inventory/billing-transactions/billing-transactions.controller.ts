import { Controller } from '@nestjs/common';
import { BillingTransactionsService } from './billing-transactions.service';

@Controller('billing-transactions')
export class BillingTransactionsController {
    constructor(private readonly billingTransactionsService: BillingTransactionsService) { }
}
