import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupplierInvoiceItemService } from './supplier-invoice-item.service';
import { SupplierInvoiceItem } from './entities/supplier-invoice-item.entity';
import { SupplierInvoice } from '../supplier-invoices/entities/supplier-invoice.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';

describe('SupplierInvoiceItemService', () => {
  let service: SupplierInvoiceItemService;

  const itemRepoMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const invoiceRepoMock = { findOne: jest.fn() };
  const productRepoMock = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierInvoiceItemService,
        {
          provide: getRepositoryToken(SupplierInvoiceItem),
          useValue: itemRepoMock,
        },
        {
          provide: getRepositoryToken(SupplierInvoice),
          useValue: invoiceRepoMock,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: productRepoMock,
        },
      ],
    }).compile();

    service = module.get<SupplierInvoiceItemService>(SupplierInvoiceItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
