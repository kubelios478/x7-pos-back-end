// src/common/filters/validation-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Handle class-validator validation errors
    if (
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse &&
      Array.isArray(exceptionResponse.message)
    ) {
      const validationErrors = exceptionResponse.message;

      response.status(status).json({
        statusCode: status,
        message: 'Validation failed',
        errors: validationErrors,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Handle other BadRequestExceptions
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : 'Bad Request';

      response.status(status).json({
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
