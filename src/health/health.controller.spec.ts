import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HEALTH_DB_TIMEOUT_MS, HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const dataSource = { query: jest.fn() };

  beforeEach(async () => {
    dataSource.query.mockReset();
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DataSource, useValue: dataSource }],
    }).compile();
    controller = module.get(HealthController);
  });

  afterEach(() => jest.useRealTimers());

  it('returns ok when the database answers', async () => {
    dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      db: 'up',
    });
    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
  });

  it('responds 503 when the query fails', async () => {
    dataSource.query.mockRejectedValue(new Error('connection refused'));

    const error = await controller.check().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as ServiceUnavailableException).getStatus()).toBe(503);
    expect((error as ServiceUnavailableException).getResponse()).toEqual({
      status: 'error',
      db: 'down',
    });
  });

  it('responds 503 when the database does not answer in time', async () => {
    jest.useFakeTimers();
    dataSource.query.mockReturnValue(new Promise(() => {}));

    const result = controller.check().catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(HEALTH_DB_TIMEOUT_MS);

    expect(await result).toBeInstanceOf(ServiceUnavailableException);
  });
});
