import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ErrorHandler } from './error-handler.util';

describe('ErrorHandler.handleDatabaseError logging', () => {
  it("logs the code and message but not the query's parameters", () => {
    const logged = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const dbError = Object.assign(new Error('connection reset'), {
      code: '08006',
      query: 'UPDATE "user" SET "password" = $1 WHERE "email" = $2',
      parameters: ['$2b$10$hashedsecret', 'someone@example.com'],
    });

    expect(() => ErrorHandler.handleDatabaseError(dbError)).toThrow(
      InternalServerErrorException,
    );

    expect(consoleError).not.toHaveBeenCalled();
    expect(logged).toHaveBeenCalledWith(
      'Database error 08006: connection reset',
      dbError.stack,
    );
    const everything = JSON.stringify(logged.mock.calls);
    expect(everything).not.toContain('someone@example.com');
    expect(everything).not.toContain('hashedsecret');
    logged.mockRestore();
    consoleError.mockRestore();
  });
});
