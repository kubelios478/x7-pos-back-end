import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { CreateSupplierPaymentAllocationDto } from './dto/create-supplier_payment_allocation.dto';
import { UpdateSupplierPaymentAllocationDto } from './dto/update-supplier_payment_allocation.dto';
import { SupplierPaymentAllocation } from './entities/supplier_payment_allocation.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { SupplierPaymentStatus } from '../supplier-payments/constants/supplier-payment-status.enum';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import {
  SupplierCreditNote,
  SupplierCreditNoteStatus,
} from '../supplier-credit-notes/entities/supplier-credit-note.entity';
import { SupplierInvoice } from '../supplier-invoices/entities/supplier-invoice.entity';
import { SupplierInvoiceStatus } from '../supplier-invoices/constants/supplier-invoice-status.enum';
import {
  GetSupplierPaymentAllocationsQueryDto,
  SupplierPaymentAllocationSortBy,
} from './dto/get-supplier_payment_allocations-query.dto';
import {
  OneSupplierPaymentAllocationResponseDto,
  SupplierPaymentAllocationResponseDto,
} from './dto/supplier_payment_allocation-response.dto';
import { PaginatedSupplierPaymentAllocationsResponseDto } from './dto/paginated-supplier_payment_allocations-response.dto';

/** Repositories an allocation write uses, bound to one transaction (or to the default manager). */
type AllocationRepos = {
  allocationRepo: Repository<SupplierPaymentAllocation>;
  paymentRepo: Repository<SupplierPayment>;
  supplierRepo: Repository<Supplier>;
  creditNoteRepo: Repository<SupplierCreditNote>;
  invoiceRepo: Repository<SupplierInvoice>;
};

/** Money compared in cents, so 0.1 + 0.2 does not exceed 0.3. */
const cents = (amount: number | string | null | undefined): number =>
  Math.round(Number(amount ?? 0) * 100);

@Injectable()
export class SupplierPaymentAllocationsService {
  constructor(
    @InjectRepository(SupplierPaymentAllocation)
    private readonly allocationRepo: Repository<SupplierPaymentAllocation>,
    @InjectRepository(SupplierPayment)
    private readonly paymentRepo: Repository<SupplierPayment>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierCreditNote)
    private readonly creditNoteRepo: Repository<SupplierCreditNote>,
    @InjectRepository(SupplierInvoice)
    private readonly invoiceRepo: Repository<SupplierInvoice>,
  ) {}

  private reposFor(manager: EntityManager): AllocationRepos {
    return {
      allocationRepo: manager.getRepository(SupplierPaymentAllocation),
      paymentRepo: manager.getRepository(SupplierPayment),
      supplierRepo: manager.getRepository(Supplier),
      creditNoteRepo: manager.getRepository(SupplierCreditNote),
      invoiceRepo: manager.getRepository(SupplierInvoice),
    };
  }

  /** Repositories outside any transaction, for the read-only scope checks. */
  private get repos(): AllocationRepos {
    return {
      allocationRepo: this.allocationRepo,
      paymentRepo: this.paymentRepo,
      supplierRepo: this.supplierRepo,
      creditNoteRepo: this.creditNoteRepo,
      invoiceRepo: this.invoiceRepo,
    };
  }

  /**
   * Validates the allocation as it will be after the write, inside the write's transaction:
   * - the supplier is the funding source's own supplier (so of the same company);
   * - the funding payment / credit note is not over-allocated;
   * - an invoice is not paid beyond its total.
   * The funding row and the target invoices are locked first, so two allocations written
   * at once cannot both pass the check against the same remaining balance.
   */
  private async assertWithinLimits(
    r: AllocationRepos,
    next: {
      id?: number;
      payment_id: number | null;
      credit_note_id?: number | null;
      supplier_id: number;
      document_number: string;
      document_type: string;
      allocated_amount: number | string;
    },
  ): Promise<void> {
    const amount = cents(next.allocated_amount);
    const excludeSelf = (qb: {
      andWhere: (sql: string, p?: object) => unknown;
    }) => {
      if (next.id != null)
        qb.andWhere('spa.id != :selfId', { selfId: next.id });
    };

    const source =
      next.payment_id != null
        ? await r.paymentRepo.findOne({
            where: { id: next.payment_id, deleted_at: IsNull() },
            lock: { mode: 'pessimistic_write' },
          })
        : await r.creditNoteRepo.findOne({
            where: { id: next.credit_note_id!, deleted_at: IsNull() },
            lock: { mode: 'pessimistic_write' },
          });
    if (!source) return; // validateRelations already reported it

    const sourceLabel =
      next.payment_id != null
        ? `supplier payment ${next.payment_id}`
        : `supplier credit note ${next.credit_note_id}`;
    if (source.supplier_id !== next.supplier_id) {
      throw new BadRequestException(
        `The allocation must be for the supplier of ${sourceLabel} (supplier ${source.supplier_id}).`,
      );
    }

    const sourceColumn =
      next.payment_id != null ? 'spa.payment_id' : 'spa.credit_note_id';
    const usedQb = r.allocationRepo
      .createQueryBuilder('spa')
      .select('COALESCE(SUM(spa.allocated_amount), 0)', 'sum')
      .where(`${sourceColumn} = :sourceId`, {
        sourceId: next.payment_id ?? next.credit_note_id,
      })
      .andWhere('spa.deleted_at IS NULL');
    excludeSelf(usedQb);
    const used = cents((await usedQb.getRawOne<{ sum: string }>())?.sum);
    const available = cents(source.total_amount) - used;
    if (amount > available) {
      throw new BadRequestException(
        `Cannot allocate ${amount / 100} from ${sourceLabel}: only ${available / 100} is left unallocated.`,
      );
    }

    if (String(next.document_type).toLowerCase() !== 'invoice') return;

    const invoices = await r.invoiceRepo.find({
      where: {
        company_id: source.company_id,
        supplier_id: next.supplier_id,
        invoice_number: next.document_number,
        deleted_at: IsNull(),
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (invoices.length === 0) return; // not an invoice registered in the system

    const paidQb = r.allocationRepo
      .createQueryBuilder('spa')
      .leftJoin(
        SupplierPayment,
        'sp',
        'sp.id = spa.payment_id AND sp.deleted_at IS NULL',
      )
      .leftJoin(
        SupplierCreditNote,
        'scn',
        'scn.id = spa.credit_note_id AND scn.deleted_at IS NULL',
      )
      .select('COALESCE(SUM(spa.allocated_amount), 0)', 'sum')
      .where('spa.deleted_at IS NULL')
      .andWhere('(sp.company_id = :companyId OR scn.company_id = :companyId)', {
        companyId: source.company_id,
      })
      .andWhere('spa.supplier_id = :supplierId', {
        supplierId: next.supplier_id,
      })
      .andWhere('spa.document_number = :documentNumber', {
        documentNumber: next.document_number,
      })
      .andWhere('LOWER(spa.document_type) = :docType', { docType: 'invoice' });
    excludeSelf(paidQb);
    const alreadyPaid = cents((await paidQb.getRawOne<{ sum: string }>())?.sum);
    const invoiceTotal = Math.max(
      ...invoices.map((i) => cents(i.total_amount)),
    );
    const due = invoiceTotal - alreadyPaid;
    if (amount > due) {
      throw new BadRequestException(
        `Cannot allocate ${amount / 100} to invoice ${next.document_number}: only ${due / 100} is still due.`,
      );
    }
  }

  /**
   * Recompute a payment's allocated_amount (sum of its live allocations) and derive its
   * allocation status. Never overrides a CANCELLED payment. Returns the saved payment
   * (needed for company-scoped invoice recompute) or null if the payment is gone.
   */
  private async recomputePayment(
    r: AllocationRepos,
    paymentId: number,
  ): Promise<SupplierPayment | null> {
    const payment = await r.paymentRepo.findOne({
      where: { id: paymentId, deleted_at: IsNull() },
    });
    if (!payment) return null;

    const raw = await r.allocationRepo
      .createQueryBuilder('spa')
      .select('COALESCE(SUM(spa.allocated_amount), 0)', 'sum')
      .where('spa.payment_id = :paymentId', { paymentId })
      .andWhere('spa.deleted_at IS NULL')
      .getRawOne<{ sum: string }>();

    const allocated = Number(raw?.sum ?? 0);
    const total = Number(payment.total_amount);
    payment.allocated_amount = allocated;

    if (payment.status !== SupplierPaymentStatus.CANCELLED) {
      if (total > 0 && allocated >= total) {
        payment.status = SupplierPaymentStatus.FULLY_ALLOCATED;
      } else if (allocated > 0) {
        payment.status = SupplierPaymentStatus.PARTIALLY_ALLOCATED;
      } else if (
        payment.status === SupplierPaymentStatus.PARTIALLY_ALLOCATED ||
        payment.status === SupplierPaymentStatus.FULLY_ALLOCATED
      ) {
        // Allocations fully removed → fall back to DRAFT (leave DRAFT/POSTED untouched).
        payment.status = SupplierPaymentStatus.DRAFT;
      }
    }
    return r.paymentRepo.save(payment);
  }

  /**
   * Recompute paid_amount/balance_due/status for every non-deleted invoice matching
   * (company, supplier, invoice_number) referenced by an allocation, summing all live
   * invoice-type allocations that point at that document across the company's payments.
   */
  private async recomputeInvoicesForDocument(
    r: AllocationRepos,
    companyId: number,
    supplierId: number,
    documentNumber: string,
  ): Promise<void> {
    const invoices = await r.invoiceRepo.find({
      where: {
        company_id: companyId,
        supplier_id: supplierId,
        invoice_number: documentNumber,
        deleted_at: IsNull(),
      },
    });
    if (invoices.length === 0) return;

    // Sum every live invoice allocation pointing at this document, funded by either a
    // payment or a credit note of this company (LEFT joins — the funding source is a XOR).
    const raw = await r.allocationRepo
      .createQueryBuilder('spa')
      .leftJoin(
        SupplierPayment,
        'sp',
        'sp.id = spa.payment_id AND sp.deleted_at IS NULL',
      )
      .leftJoin(
        SupplierCreditNote,
        'scn',
        'scn.id = spa.credit_note_id AND scn.deleted_at IS NULL',
      )
      .select('COALESCE(SUM(spa.allocated_amount), 0)', 'sum')
      .where('spa.deleted_at IS NULL')
      .andWhere('(sp.company_id = :companyId OR scn.company_id = :companyId)', {
        companyId,
      })
      .andWhere('spa.supplier_id = :supplierId', { supplierId })
      .andWhere('spa.document_number = :documentNumber', { documentNumber })
      .andWhere('LOWER(spa.document_type) = :docType', { docType: 'invoice' })
      .getRawOne<{ sum: string }>();

    const paid = Number(raw?.sum ?? 0);
    for (const inv of invoices) {
      const total = Number(inv.total_amount);
      inv.paid_amount = paid;
      inv.balance_due = Math.max(0, total - paid);
      if (inv.status !== SupplierInvoiceStatus.CANCELLED) {
        if (paid <= 0) inv.status = SupplierInvoiceStatus.PENDING;
        else if (paid >= total) inv.status = SupplierInvoiceStatus.PAID;
        else inv.status = SupplierInvoiceStatus.PARTIALLY_PAID;
      }
      await r.invoiceRepo.save(inv);
    }
  }

  /**
   * Recompute applied_amount/status for a credit note from its live allocations
   * (sum of allocations that reference it). Never overrides a CANCELLED credit note.
   */
  private async recomputeCreditNote(
    r: AllocationRepos,
    creditNoteId: number,
  ): Promise<void> {
    const cn = await r.creditNoteRepo.findOne({
      where: { id: creditNoteId, deleted_at: IsNull() },
    });
    if (!cn) return;

    const raw = await r.allocationRepo
      .createQueryBuilder('spa')
      .select('COALESCE(SUM(spa.allocated_amount), 0)', 'sum')
      .where('spa.credit_note_id = :creditNoteId', { creditNoteId })
      .andWhere('spa.deleted_at IS NULL')
      .getRawOne<{ sum: string }>();

    const applied = Number(raw?.sum ?? 0);
    const total = Number(cn.total_amount);
    cn.applied_amount = applied;

    if (cn.status !== SupplierCreditNoteStatus.CANCELLED) {
      if (total > 0 && applied >= total) {
        cn.status = SupplierCreditNoteStatus.FULLY_APPLIED;
      } else if (applied > 0) {
        cn.status = SupplierCreditNoteStatus.PARTIALLY_APPLIED;
      } else if (
        cn.status === SupplierCreditNoteStatus.PARTIALLY_APPLIED ||
        cn.status === SupplierCreditNoteStatus.FULLY_APPLIED
      ) {
        // Applications fully removed → revert to ISSUED (it had to be issued to be applied).
        cn.status = SupplierCreditNoteStatus.ISSUED;
      }
    }
    await r.creditNoteRepo.save(cn);
  }

  /**
   * Recompute every aggregate an allocation touches: the payment, the target invoice(s)
   * (for invoice allocations), and the credit note (when the allocation references one).
   * The funding source is a XOR, so the company for the invoice recompute comes from
   * whichever side is set — payment for cash allocations, credit note for credit ones.
   */
  private async cascadeAggregates(
    r: AllocationRepos,
    ref: {
      payment_id: number | null;
      supplier_id: number;
      document_number: string;
      document_type: string;
      credit_note_id?: number | null;
    },
  ): Promise<void> {
    let companyId: number | null = null;

    if (ref.payment_id != null) {
      const payment = await this.recomputePayment(r, ref.payment_id);
      companyId = payment?.company_id ?? null;
    }
    if (ref.credit_note_id != null) {
      await this.recomputeCreditNote(r, ref.credit_note_id);
      if (companyId == null) {
        const cn = await r.creditNoteRepo.findOne({
          where: { id: ref.credit_note_id, deleted_at: IsNull() },
        });
        companyId = cn?.company_id ?? null;
      }
    }

    if (
      companyId != null &&
      String(ref.document_type).toLowerCase() === 'invoice'
    ) {
      await this.recomputeInvoicesForDocument(
        r,
        companyId,
        ref.supplier_id,
        ref.document_number,
      );
    }
  }

  private async validateRelations(
    r: AllocationRepos,
    dto: Partial<CreateSupplierPaymentAllocationDto>,
    current?: SupplierPaymentAllocation,
    scopedCompanyId?: number,
  ): Promise<void> {
    // Resolve the funding source as it will be AFTER this write, so the XOR guard also
    // covers partial updates (e.g. clearing payment_id while setting credit_note_id).
    const paymentId =
      dto.payment_id !== undefined ? dto.payment_id : current?.payment_id;
    const creditNoteIdResolved =
      dto.credit_note_id !== undefined
        ? dto.credit_note_id
        : current?.credit_note_id;

    // Mutual exclusion: exactly one funding source — never both, never neither.
    // Only enforced on creates and on writes that actually touch a source field, so
    // legacy rows (written when payment_id was mandatory alongside credit_note_id)
    // stay editable and removable.
    const touchesSource =
      dto.payment_id !== undefined || dto.credit_note_id !== undefined;
    if (
      (current === undefined || touchesSource) &&
      (paymentId == null) === (creditNoteIdResolved == null)
    ) {
      throw new BadRequestException(
        'An allocation must be funded by exactly one source: either a payment or a credit note.',
      );
    }

    if (paymentId != null) {
      const payment = await r.paymentRepo.findOne({
        where: { id: paymentId, deleted_at: IsNull() },
      });
      if (!payment) {
        throw new NotFoundException(
          `Supplier payment with ID ${paymentId} not found`,
        );
      }
      // Multi-tenant guard: merchant users can only allocate their own company's payments.
      if (scopedCompanyId != null && payment.company_id !== scopedCompanyId) {
        throw new NotFoundException(
          `Supplier payment with ID ${paymentId} not found`,
        );
      }
    }

    const supplierId = dto.supplier_id ?? current?.supplier_id;
    if (supplierId != null) {
      const supplier = await r.supplierRepo.findOne({
        where: { id: supplierId },
      });
      if (!supplier) {
        throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
      }
    }

    if (creditNoteIdResolved != null) {
      const creditNote = await r.creditNoteRepo.findOne({
        where: { id: creditNoteIdResolved, deleted_at: IsNull() },
      });
      if (!creditNote) {
        throw new NotFoundException(
          `Supplier credit note with ID ${creditNoteIdResolved} not found`,
        );
      }
      // Multi-tenant guard: credit-note-funded allocations have no payment to scope
      // against, so the credit note itself carries the company check.
      if (
        scopedCompanyId != null &&
        creditNote.company_id !== scopedCompanyId
      ) {
        throw new NotFoundException(
          `Supplier credit note with ID ${creditNoteIdResolved} not found`,
        );
      }
    }
  }

  private toResponseDto(
    row: SupplierPaymentAllocation,
  ): SupplierPaymentAllocationResponseDto {
    return {
      id: row.id,
      payment_id: row.payment_id,
      credit_note_id: row.credit_note_id ?? null,
      supplier_id: row.supplier_id,
      document_number: row.document_number,
      document_type: row.document_type,
      allocated_amount: Number(row.allocated_amount),
      created_at: row.created_at?.toISOString() ?? '',
    };
  }

  async create(
    dto: CreateSupplierPaymentAllocationDto,
    scopedCompanyId?: number,
  ): Promise<OneSupplierPaymentAllocationResponseDto> {
    // One transaction: the allocation and the payment / invoice / credit note aggregates
    // it changes are written together, or not at all.
    const saved = await this.allocationRepo.manager.transaction(
      async (manager) => {
        const r = this.reposFor(manager);
        await this.validateRelations(r, dto, undefined, scopedCompanyId);

        const row = r.allocationRepo.create({
          payment_id: dto.payment_id ?? null,
          credit_note_id: dto.credit_note_id ?? null,
          supplier_id: dto.supplier_id,
          document_number: dto.document_number,
          document_type: dto.document_type,
          allocated_amount: dto.allocated_amount,
        });
        await this.assertWithinLimits(r, row);

        const created = await r.allocationRepo.save(row);
        await this.cascadeAggregates(r, created);
        return created;
      },
    );
    return {
      statusCode: 201,
      message: 'Supplier payment allocation created successfully',
      data: this.toResponseDto(saved),
    };
  }

  async findAll(
    query: GetSupplierPaymentAllocationsQueryDto,
    scopedCompanyId?: number,
  ): Promise<PaginatedSupplierPaymentAllocationsResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? SupplierPaymentAllocationSortBy.CREATED_AT;
    const sortOrder = query.sortOrder ?? 'DESC';

    const qb = this.allocationRepo
      .createQueryBuilder('spa')
      .where('spa.deleted_at IS NULL');

    // Multi-tenant guard: merchant users only see allocations funded by their own
    // company. LEFT joins on both sides — a credit-note-funded allocation has no
    // payment_id, and an inner join on the payment would hide it entirely.
    if (scopedCompanyId != null) {
      qb.leftJoin(
        SupplierPayment,
        'sp',
        'sp.id = spa.payment_id AND sp.deleted_at IS NULL',
      )
        .leftJoin(
          SupplierCreditNote,
          'scn',
          'scn.id = spa.credit_note_id AND scn.deleted_at IS NULL',
        )
        .andWhere(
          '(sp.company_id = :companyId OR scn.company_id = :companyId)',
          {
            companyId: scopedCompanyId,
          },
        );
    }

    if (query.payment_id != null) {
      qb.andWhere('spa.payment_id = :paymentId', {
        paymentId: query.payment_id,
      });
    }
    if (query.supplier_id != null) {
      qb.andWhere('spa.supplier_id = :supplierId', {
        supplierId: query.supplier_id,
      });
    }
    if (query.credit_note_id != null) {
      qb.andWhere('spa.credit_note_id = :creditNoteId', {
        creditNoteId: query.credit_note_id,
      });
    }

    const orderColumn =
      sortBy === SupplierPaymentAllocationSortBy.ALLOCATED_AMOUNT
        ? 'spa.allocated_amount'
        : sortBy === SupplierPaymentAllocationSortBy.DOCUMENT_NUMBER
          ? 'spa.document_number'
          : sortBy === SupplierPaymentAllocationSortBy.ID
            ? 'spa.id'
            : 'spa.created_at';
    qb.orderBy(orderColumn, sortOrder);

    const total = await qb.getCount();
    const items = await qb.skip(skip).take(limit).getMany();
    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      message: 'Supplier payment allocations retrieved successfully',
      data: items.map((item) => this.toResponseDto(item)),
      paginationMeta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(
    id: number,
    scopedCompanyId?: number,
  ): Promise<OneSupplierPaymentAllocationResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment allocation ID');
    }

    const row = await this.allocationRepo.findOne({
      where: { id, deleted_at: IsNull() },
    });
    if (!row) {
      throw new NotFoundException(
        `Supplier payment allocation with ID ${id} not found`,
      );
    }

    // Scope guard: the allocation's payment must belong to the user's company.
    await this.validateRelations(this.repos, {}, row, scopedCompanyId);

    return {
      statusCode: 200,
      message: 'Supplier payment allocation retrieved successfully',
      data: this.toResponseDto(row),
    };
  }

  async update(
    id: number,
    dto: UpdateSupplierPaymentAllocationDto,
    scopedCompanyId?: number,
  ): Promise<OneSupplierPaymentAllocationResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment allocation ID');
    }

    const saved = await this.allocationRepo.manager.transaction(
      async (manager) => {
        const r = this.reposFor(manager);
        const row = await r.allocationRepo.findOne({
          where: { id, deleted_at: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });
        if (!row) {
          throw new NotFoundException(
            `Supplier payment allocation with ID ${id} not found`,
          );
        }

        // Scope guard on the existing row's payment, plus validate the (possibly new) relations.
        await this.validateRelations(r, {}, row, scopedCompanyId);
        await this.validateRelations(r, dto, row, scopedCompanyId);

        // Capture the pre-change reference so aggregates for the previous target are recomputed too.
        const before = {
          payment_id: row.payment_id,
          supplier_id: row.supplier_id,
          document_number: row.document_number,
          document_type: row.document_type,
          credit_note_id: row.credit_note_id,
        };

        // Both sources accept an explicit null so the funding source can be switched.
        if (dto.payment_id !== undefined)
          row.payment_id = dto.payment_id ?? null;
        if (dto.credit_note_id !== undefined)
          row.credit_note_id = dto.credit_note_id ?? null;
        if (dto.supplier_id != null) row.supplier_id = dto.supplier_id;
        if (dto.document_number != null)
          row.document_number = dto.document_number;
        if (dto.document_type != null) row.document_type = dto.document_type;
        if (dto.allocated_amount != null)
          row.allocated_amount = dto.allocated_amount as any;

        await this.assertWithinLimits(r, row);

        const updated = await r.allocationRepo.save(row);
        await this.cascadeAggregates(r, before);
        await this.cascadeAggregates(r, updated);
        return updated;
      },
    );
    return {
      statusCode: 200,
      message: 'Supplier payment allocation updated successfully',
      data: this.toResponseDto(saved),
    };
  }

  async remove(
    id: number,
    scopedCompanyId?: number,
  ): Promise<OneSupplierPaymentAllocationResponseDto> {
    if (!id || id <= 0) {
      throw new BadRequestException('Invalid supplier payment allocation ID');
    }

    const row = await this.allocationRepo.manager.transaction(
      async (manager) => {
        const r = this.reposFor(manager);
        const existing = await r.allocationRepo.findOne({
          where: { id, deleted_at: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });
        if (!existing) {
          throw new NotFoundException(
            `Supplier payment allocation with ID ${id} not found`,
          );
        }
        // Scope guard: the allocation's payment must belong to the user's company.
        await this.validateRelations(r, {}, existing, scopedCompanyId);

        existing.deleted_at = new Date();
        await r.allocationRepo.save(existing);
        await this.cascadeAggregates(r, existing);
        return existing;
      },
    );

    return {
      statusCode: 200,
      message: 'Supplier payment allocation deleted successfully',
      data: this.toResponseDto(row),
    };
  }
}
