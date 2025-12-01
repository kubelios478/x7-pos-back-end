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
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      if (Array.isArray(exceptionResponse.message)) {
        // Multiple validation errors
        const validationErrors = exceptionResponse.message;

        response.status(status).json({
          statusCode: status,
          message: 'Validation failed',
          errors: validationErrors,
          timestamp: new Date().toISOString(),
        });
      } else if (typeof exceptionResponse.message === 'string') {
        // Single validation error message
        response.status(status).json({
          statusCode: status,
          message: exceptionResponse.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        // Fallback for other object types
        response.status(status).json({
          statusCode: status,
          message: 'Bad Request',
          errors: exceptionResponse,
          timestamp: new Date().toISOString(),
        });
      }
    } else if (typeof exceptionResponse === 'string') {
      // Handle string error messages
      response.status(status).json({
        statusCode: status,
        message: exceptionResponse,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Fallback for unknown error types
      response.status(status).json({
        statusCode: status,
        message: 'Bad Request',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
