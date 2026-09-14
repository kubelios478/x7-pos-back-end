import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CollaboratorTimeEntriesService,
  DAILY_OVERTIME_THRESHOLD_HOURS,
} from './collaborator-time-entries.service';
import { TimeEntry } from './entities/time-entry.entity';
import { TimeEntryRevision } from './entities/time-entry-revision.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { Shift } from 'src/restaurant-operations/shift/shifts/entities/shift.entity';

/**
 * What these stories added to the module: net hours calculation, chronology and overlap guards, and the immutable trace of corrections.
 */
describe('CollaboratorTimeEntriesService · punch rules & audit', () => {
  let service: CollaboratorTimeEntriesService;

  const MERCHANT_ID = 3;
  const SUPERVISOR_ID = 7;

  const at = (h: number, m = 0) => new Date(2026, 7, 30, h, m, 0);

  const entry = (over: Partial<TimeEntry> = {}): TimeEntry =>
    ({
      id: 42,
      company_id: 1,
      merchant_id: MERCHANT_ID,
      collaborator_id: 4,
      shift_id: null,
      clock_in: at(8),
      clock_out: at(16),
      break_minutes: 30,
      adjustment_reason: null,
      is_edited: false,
      edited_by_user_id: null,
      edited_at: null,
      regular_hours: 7.5,
      overtime_hours: 0,
      double_overtime_hours: 0,
      approved: false,
      created_at: at(8),
      ...over,
    }) as unknown as TimeEntry;

  const timeEntryRepo = {
    create: jest.fn((v: unknown) => v),
    save: jest.fn((v: unknown) =>
      Promise.resolve({ id: 42, ...(v as object) }),
    ),
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn(),
  };
  const revisionRepo = {
    create: jest.fn((v: unknown) => v),
    save: jest.fn((v: unknown) => Promise.resolve(v)),
    find: jest.fn().mockResolvedValue([]),
  };
  const companyRepo = { findOne: jest.fn() };
  const merchantRepo = { findOne: jest.fn() };
  const collaboratorRepo = { findOne: jest.fn() };
  const shiftRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboratorTimeEntriesService,
        { provide: getRepositoryToken(TimeEntry), useValue: timeEntryRepo },
        {
          provide: getRepositoryToken(TimeEntryRevision),
          useValue: revisionRepo,
        },
        { provide: getRepositoryToken(Company), useValue: companyRepo },
        { provide: getRepositoryToken(Merchant), useValue: merchantRepo },
        {
          provide: getRepositoryToken(Collaborator),
          useValue: collaboratorRepo,
        },
        { provide: getRepositoryToken(Shift), useValue: shiftRepo },
      ],
    }).compile();

    service = module.get(CollaboratorTimeEntriesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    [timeEntryRepo.findOne, timeEntryRepo.find, timeEntryRepo.save].forEach(
      (m) => m.mockReset(),
    );
    timeEntryRepo.find.mockResolvedValue([]);
    timeEntryRepo.save.mockImplementation((v: unknown) =>
      Promise.resolve({ id: 42, ...(v as object) }),
    );
    revisionRepo.save.mockImplementation((v: unknown) => Promise.resolve(v));
  });

  // ================= Net Hours =================

  describe('computeHours', () => {
    it('deduct the rest period from the gross interval', () => {
      // 8 hours clock time minus 30 minutes break = 7.5 hours payable.
      expect(service.computeHours(at(8), at(16), 30)).toMatchObject({
        net: 7.5,
        regular: 7.5,
        overtime: 0,
      });
    });

    it('part of the hours by the daily threshold', () => {
      // 10 net hours with a threshold of 8 → 8 ordinary + 2 extra.
      const r = service.computeHours(at(8), at(18), 0);
      expect(r.regular).toBe(DAILY_OVERTIME_THRESHOLD_HOURS);
      expect(r.overtime).toBe(2);
    });

    it('an open shift does not compute anything yet', () => {
      expect(service.computeHours(at(8), null, 30)).toEqual({
        regular: 0,
        overtime: 0,
        net: 0,
      });
    });

    it('An excessively long break does not leave the net result negative.', () => {
      expect(service.computeHours(at(8), at(9), 600).net).toBe(0);
    });

    it('rounds to two decimal places, which is what persists in the column', () => {
      // 7 h 20 min = 7,33…
      expect(service.computeHours(at(8), at(15, 20), 0).net).toBe(7.33);
    });
  });

  // ================= Save =================

  describe('saves when creating', () => {
    const dto = {
      company_id: 1,
      merchant_id: MERCHANT_ID,
      collaborator_id: 4,
      clock_in: at(8).toISOString(),
      clock_out: at(16).toISOString(),
      break_minutes: 30,
    };

    const prime = () => {
      companyRepo.findOne.mockResolvedValue({ id: 1 });
      merchantRepo.findOne.mockResolvedValue({ id: MERCHANT_ID });
      // The service validates that the collaborator is from the same merchant.
      collaboratorRepo.findOne.mockResolvedValue({
        id: 4,
        merchant_id: MERCHANT_ID,
      });
    };

    it('It rejects an exit prior to entry, with the message of history.', async () => {
      prime();

      await expect(
        service.create({ ...dto, clock_out: at(7).toISOString() }, MERCHANT_ID),
      ).rejects.toThrow(
        'Clock-Out timestamp must be after Clock-In timestamp.',
      );
    });

    it('It rejects an interval that overlaps with another time entry of the same collaborator', async () => {
      prime();
      timeEntryRepo.find.mockResolvedValue([
        entry({ id: 9, clock_in: at(7), clock_out: at(12) }),
      ]);

      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        'overlaps time entry #TME-9',
      );
    });

    it('an open shift blocks any subsequent time entry until closed', async () => {
      prime();
      timeEntryRepo.find.mockResolvedValue([
        entry({ id: 9, clock_in: at(6), clock_out: null }),
      ]);

      await expect(service.create(dto, MERCHANT_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows a time entry that does not overlap with others', async () => {
      prime();
      timeEntryRepo.find.mockResolvedValue([
        entry({ id: 9, clock_in: at(17), clock_out: at(20) }),
      ]);

      await expect(service.create(dto, MERCHANT_ID)).resolves.toBeDefined();
    });

    it('calculates the hours on the server, ignoring those sent by the client', async () => {
      prime();

      await service.create(
        { ...dto, regular_hours: 99, overtime_hours: 99 },
        MERCHANT_ID,
      );

      const saved = timeEntryRepo.save.mock.calls[0][0] as TimeEntry;
      expect(Number(saved.regular_hours)).toBe(7.5);
      expect(Number(saved.overtime_hours)).toBe(0);
    });

    it('allows a manual time entry without a scheduled shift', async () => {
      prime();

      await service.create(dto, MERCHANT_ID);

      const saved = timeEntryRepo.save.mock.calls[0][0] as TimeEntry;
      expect(saved.shift_id).toBeNull();
      expect(shiftRepo.findOne).not.toHaveBeenCalled();
    });
  });

  // ================= Audit trail =================

  describe('correction of a signing', () => {
    it('demands justification for touching the trademarks', async () => {
      timeEntryRepo.findOne.mockResolvedValue(entry());

      await expect(
        service.update(
          42,
          { clock_out: at(17).toISOString() },
          MERCHANT_ID,
          SUPERVISOR_ID,
        ),
      ).rejects.toThrow(
        'An adjustment reason is required when correcting a punch.',
      );
    });

    it('marks the row as edited and signs who and when', async () => {
      timeEntryRepo.findOne.mockResolvedValue(entry());

      await service.update(
        42,
        { clock_out: at(17).toISOString(), adjustment_reason: 'Missed Punch' },
        MERCHANT_ID,
        SUPERVISOR_ID,
      );

      const saved = timeEntryRepo.save.mock.calls[0][0] as TimeEntry;
      expect(saved.is_edited).toBe(true);
      expect(saved.edited_by_user_id).toBe(SUPERVISOR_ID);
      expect(saved.edited_at).toBeInstanceOf(Date);
      expect(saved.adjustment_reason).toBe('Missed Punch');
    });

    it('saves the before and after in the audit trail', async () => {
      timeEntryRepo.findOne.mockResolvedValue(entry());

      await service.update(
        42,
        {
          clock_out: at(18).toISOString(),
          break_minutes: 60,
          adjustment_reason: 'Supervisor Authorization',
        },
        MERCHANT_ID,
        SUPERVISOR_ID,
      );

      expect(revisionRepo.save).toHaveBeenCalledTimes(1);
      const revision = revisionRepo.create.mock
        .calls[0][0] as TimeEntryRevision;
      expect(revision).toMatchObject({
        time_entry_id: 42,
        edited_by_user_id: SUPERVISOR_ID,
        adjustment_reason: 'Supervisor Authorization',
        previous_clock_out: at(16),
        previous_break_minutes: 30,
        new_break_minutes: 60,
      });
    });

    it('calculates the hours after the correction', async () => {
      timeEntryRepo.findOne.mockResolvedValue(entry());

      await service.update(
        42,
        { clock_out: at(19).toISOString(), adjustment_reason: 'Missed Punch' },
        MERCHANT_ID,
        SUPERVISOR_ID,
      );

      const saved = timeEntryRepo.save.mock.calls[0][0] as TimeEntry;
      // 8→19 are 11 hours minus 30 min = 10.5 net → 8 ordinary + 2.5 extra.
      expect(Number(saved.regular_hours)).toBe(8);
      expect(Number(saved.overtime_hours)).toBe(2.5);
    });

    it('approving a time entry is not a correction: it does not require a reason nor does it leave a revision', async () => {
      timeEntryRepo.findOne.mockResolvedValue(entry());

      await service.update(42, { approved: true }, MERCHANT_ID, SUPERVISOR_ID);

      const saved = timeEntryRepo.save.mock.calls[0][0] as TimeEntry;
      expect(saved.is_edited).toBe(false);
      expect(revisionRepo.save).not.toHaveBeenCalled();
    });

    it('the correction cannot leave the time entry overlapping with another', async () => {
      timeEntryRepo.findOne.mockResolvedValue(entry());
      timeEntryRepo.find.mockResolvedValue([
        entry({ id: 9, clock_in: at(17), clock_out: at(20) }),
      ]);

      await expect(
        service.update(
          42,
          {
            clock_out: at(18).toISOString(),
            adjustment_reason: 'Missed Punch',
          },
          MERCHANT_ID,
          SUPERVISOR_ID,
        ),
      ).rejects.toThrow('overlaps time entry #TME-9');
    });

    it('the time entry itself does not count as overlap with itself', async () => {
      timeEntryRepo.findOne.mockResolvedValue(entry());
      timeEntryRepo.find.mockResolvedValue([entry()]);

      await expect(
        service.update(
          42,
          {
            clock_out: at(17).toISOString(),
            adjustment_reason: 'Missed Punch',
          },
          MERCHANT_ID,
          SUPERVISOR_ID,
        ),
      ).resolves.toBeDefined();
    });
  });

  // ================= Audit trail =================

  describe('revisions', () => {
    it('returns the audit trail from the most recent to the oldest', async () => {
      timeEntryRepo.findOne.mockResolvedValue(entry());
      revisionRepo.find.mockResolvedValue([{ id: 2 }, { id: 1 }]);

      const res = await service.revisions(42, MERCHANT_ID);

      expect(res.data).toHaveLength(2);
      expect(revisionRepo.find).toHaveBeenCalledWith({
        where: { time_entry_id: 42 },
        order: { created_at: 'DESC' },
      });
    });

    it('does not show the audit trail of another merchant', async () => {
      timeEntryRepo.findOne.mockResolvedValue(entry({ merchant_id: 99 }));

      await expect(service.revisions(42, MERCHANT_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('fails if the time entry does not exist', async () => {
      timeEntryRepo.findOne.mockResolvedValue(null);

      await expect(service.revisions(404, MERCHANT_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
