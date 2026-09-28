import { Test, TestingModule } from '@nestjs/testing';
import { ReservationGuestService } from './reservation-guest.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReservationGuest } from './entities/reservation-guest.entity';
import { Reservation } from 'src/restaurant-operations/reservations/reservation/entities/reservation.entity';
import { DataSource } from 'typeorm';

describe('ReservationGuestService', () => {
  let service: ReservationGuestService;

  const mockGuestRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
  };

  const mockReservationRepository = {
    findOneBy: jest.fn(),
  };

  // El manager de la transacción: create/update/remove escriben a través de él porque la
  // exclusividad del contacto principal y el alta son una sola decisión.
  // `lastSaved` imita la relectura que hace el servicio tras la transacción: devuelve la fila
  // completa, no sólo su id, que es lo que la respuesta mapea.
  let lastSaved: Record<string, unknown> = {};

  const mockEntityManager = {
    create: jest.fn().mockImplementation((_entity, dto) => dto),
    save: jest.fn().mockImplementation((_entity, dto) => {
      lastSaved = { id: 1, ...dto };
      return Promise.resolve(lastSaved);
    }),
    update: jest.fn().mockResolvedValue({ affected: 0 }),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn().mockImplementation(() => Promise.resolve(lastSaved)),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: (m: typeof mockEntityManager) => unknown) =>
      cb(mockEntityManager),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationGuestService,
        {
          provide: getRepositoryToken(ReservationGuest),
          useValue: mockGuestRepository,
        },
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ReservationGuestService>(ReservationGuestService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockEntityManager.create.mockImplementation((_entity, dto) => dto);
    lastSaved = {};
    mockEntityManager.save.mockImplementation((_entity, dto) => {
      lastSaved = { id: 1, ...dto };
      return Promise.resolve(lastSaved);
    });
    mockEntityManager.update.mockResolvedValue({ affected: 0 });
    mockEntityManager.findOne.mockResolvedValue(null);
    mockEntityManager.findOneByOrFail.mockImplementation(() =>
      Promise.resolve(lastSaved),
    );
    mockDataSource.transaction.mockImplementation((cb: any) => cb(mockEntityManager));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = { reservation_id: 1, name: 'John Doe' };
    const merchantId = 1;

    it('should create a guest successfully', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        is_active: true,
      });
      const result = await service.create(createDto, merchantId);
      expect(result.statusCode).toBe(201);
      expect(result.data.name).toBe(createDto.name);
    });

    it('should fail if reservation belongs to another merchant', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue(null);
      await expect(service.create(createDto, merchantId)).rejects.toThrow(
        'Reservation not found or does not belong to your merchant',
      );
    });

    it('should fail if reservation is not active', async () => {
      mockReservationRepository.findOneBy.mockResolvedValue(null);
      await expect(service.create(createDto, merchantId)).rejects.toThrow(
        'Reservation not found or does not belong to your merchant',
      );
    });
  });

  describe('primary contact guardrails', () => {
    beforeEach(() => {
      mockReservationRepository.findOneBy.mockResolvedValue({
        id: 1,
        merchant_id: 1,
        is_active: true,
      });
    });

    it('demotes the previous primary when a new guest is marked primary', async () => {
      await service.create(
        { reservation_id: 1, name: 'Carlos', is_primary: true },
        1,
      );

      // "Exactamente uno" no lo impone la base: lo impone esta actualización.
      expect(mockEntityManager.update).toHaveBeenCalledWith(
        ReservationGuest,
        { reservation_id: 1, id: expect.anything(), is_primary: true },
        { is_primary: false },
      );
    });

    it('promotes the first guest of an empty roster to primary', async () => {
      // Sin principal activo y con un invitado en el roster → se eleva.
      mockEntityManager.findOne
        .mockResolvedValueOnce(null) // no hay principal
        .mockResolvedValueOnce({ id: 7, reservation_id: 1, is_primary: false });

      await service.create({ reservation_id: 1, name: 'Carlos' }, 1);

      expect(mockEntityManager.save).toHaveBeenCalledWith(
        ReservationGuest,
        expect.objectContaining({ id: 7, is_primary: true }),
      );
    });

    it('leaves an existing primary alone', async () => {
      mockEntityManager.findOne.mockResolvedValue({ id: 3, is_primary: true });

      await service.create({ reservation_id: 1, name: 'Companion' }, 1);

      expect(mockEntityManager.save).not.toHaveBeenCalledWith(
        ReservationGuest,
        expect.objectContaining({ is_primary: true, id: 3 }),
      );
    });

    it('elevates the next active guest when the primary is removed', async () => {
      mockGuestRepository.findOne.mockResolvedValue({
        id: 1,
        reservation_id: 1,
        is_primary: true,
        reservation: { merchant_id: 1 },
      });
      mockGuestRepository.findOneBy.mockResolvedValue({
        id: 1,
        reservation_id: 1,
        is_primary: true,
        is_active: true,
      });
      mockEntityManager.findOne
        .mockResolvedValueOnce(null) // ya no queda principal activo
        .mockResolvedValueOnce({ id: 8, reservation_id: 1, is_primary: false });

      await service.remove(1, 1);

      // El eliminado se desactiva Y deja de ser principal…
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        ReservationGuest,
        expect.objectContaining({ id: 1, is_active: false, is_primary: false }),
      );
      // …y el siguiente del roster toma el relevo.
      expect(mockEntityManager.save).toHaveBeenCalledWith(
        ReservationGuest,
        expect.objectContaining({ id: 8, is_primary: true }),
      );
    });

    it('does not crash when the last guest of a roster is removed', async () => {
      mockGuestRepository.findOne.mockResolvedValue({
        id: 1,
        reservation_id: 1,
        is_primary: true,
        reservation: { merchant_id: 1 },
      });
      mockGuestRepository.findOneBy.mockResolvedValue({
        id: 1,
        reservation_id: 1,
        is_primary: true,
      });
      mockEntityManager.findOne.mockResolvedValue(null); // roster vacío

      await expect(service.remove(1, 1)).resolves.toBeDefined();
    });
  });

  describe('findAllGlobal', () => {
    const merchantId = 1;

    it('should return paginated and mapped guests', async () => {
      const guests = [{ id: 1, name: 'John', reservation: { merchant_id: 1 } }];
      mockGuestRepository.findAndCount.mockResolvedValue([guests, 1]);

      const result = await service.findAllGlobal(merchantId, {
        page: 1,
        limit: 10,
      });
      expect(result.statusCode).toBe(200);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('John');
    });

    it('should apply ILike filter when name is provided', async () => {
      mockGuestRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(merchantId, { name: 'John' });

      expect(mockGuestRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.anything(), // ILike is an object at runtime
          }),
        }),
      );
    });

    it('should filter by reservation_id if provided', async () => {
      mockGuestRepository.findAndCount.mockResolvedValue([[], 0]);
      await service.findAllGlobal(merchantId, { reservation_id: 10 });

      expect(mockGuestRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reservation_id: 10,
          }),
        }),
      );
    });
  });

  describe('global guest lookup', () => {
    it('searches across name, email and phone', async () => {
      mockGuestRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllGlobal(1, { search: 'carlos' });

      const [{ where }] = mockGuestRepository.findAndCount.mock.calls[0];
      expect(Array.isArray(where)).toBe(true);
      expect(where).toHaveLength(3);
      // El ámbito del comercio se repite en cada rama del OR; si faltara en una, esa rama
      // devolvería invitados de otros locales.
      where.forEach((branch: any) => {
        expect(branch.reservation).toEqual({ merchant_id: 1 });
        expect(branch.is_active).toBe(true);
      });
      expect(Object.keys(where[0])).toContain('name');
      expect(Object.keys(where[1])).toContain('email');
      expect(Object.keys(where[2])).toContain('phone');
    });

    it('keeps a plain where-object when there is no search term', async () => {
      mockGuestRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllGlobal(1, {});

      const [{ where }] = mockGuestRepository.findAndCount.mock.calls[0];
      expect(Array.isArray(where)).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should return a guest by ID if merchant matches', async () => {
      mockGuestRepository.findOne.mockResolvedValue({
        id: 1,
        name: 'John',
        reservation: { merchant_id: 1 },
      });
      const result = await service.findOne(1, 1);
      expect(result.data.id).toBe(1);
    });

    it('should throw if guest belongs to another merchant', async () => {
      mockGuestRepository.findOne.mockResolvedValue({
        id: 1,
        name: 'John',
        reservation: { merchant_id: 2 },
      });
      await expect(service.findOne(1, 1)).rejects.toThrow('Guest not found');
    });

    it('should throw if guest not found', async () => {
      mockGuestRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne(1, 1)).rejects.toThrow('Guest not found');
    });
  });

  describe('update', () => {
    it('should update guest info successfully', async () => {
      const guest = { id: 1, name: 'Old', reservation: { merchant_id: 1 } };
      mockGuestRepository.findOne.mockResolvedValue(guest);
      mockGuestRepository.findOneBy.mockResolvedValue(guest);

      const result = await service.update(
        1,
        { name: 'New', email: 'new@test.com' },
        1,
      );
      expect(result.data.name).toBe('New');
      expect(mockEntityManager.save).toHaveBeenCalled();
    });

    it('should fail if guest belongs to another merchant', async () => {
      mockGuestRepository.findOne.mockResolvedValue({
        id: 1,
        reservation: { merchant_id: 2 },
      });
      await expect(service.update(1, { name: 'New' }, 1)).rejects.toThrow(
        'Guest not found',
      );
    });
  });

  describe('remove', () => {
    it('should soft delete guest successfully', async () => {
      const guest = { id: 1, is_active: true, reservation: { merchant_id: 1 } };
      mockGuestRepository.findOne.mockResolvedValue(guest);
      mockGuestRepository.findOneBy.mockResolvedValue(guest);

      const result = await service.remove(1, 1);
      expect(guest.is_active).toBe(false);
      // La baja va por el manager: desactivar y recolocar el contacto principal son una
      // sola decisión y viajan en la misma transacción.
      expect(mockEntityManager.save).toHaveBeenCalledWith(ReservationGuest, guest);
      expect(result.statusCode).toBe(200);
    });

    it('should fail if guest belongs to another merchant', async () => {
      mockGuestRepository.findOne.mockResolvedValue({
        id: 1,
        reservation: { merchant_id: 2 },
      });
      await expect(service.remove(1, 1)).rejects.toThrow('Guest not found');
    });
  });
});
