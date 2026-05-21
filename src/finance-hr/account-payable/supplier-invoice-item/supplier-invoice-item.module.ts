import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierInvoiceItemService } from './supplier-invoice-item.service';
import { SupplierInvoiceItemController } from './supplier-invoice-item.controller';
import { SupplierInvoiceItem } from './entities/supplier-invoice-item.entity';
import { SupplierInvoice } from '../supplier-invoices/entities/supplier-invoice.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      SupplierInvoiceItem,
      SupplierInvoice,
      Product,
      Variant,
      Merchant,
    ]),
  ],
  controllers: [SupplierInvoiceItemController],
  providers: [SupplierInvoiceItemService],
  exports: [SupplierInvoiceItemService],
})
export class SupplierInvoiceItemModule {}
