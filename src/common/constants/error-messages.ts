// src/common/constants/error-messages.ts
export enum ErrorMessage {
  // 400 Bad Request
  INVALID_INPUT = 'Invalid input data provided',
  INVALID_ID = 'Invalid ID parameter',
  INVALID_FORMAT = 'Invalid data format',
  MISSING_REQUIRED_FIELD = 'Required field is missing',
  INVALID_EMAIL_FORMAT = 'Invalid email format',
  INVALID_PASSWORD_FORMAT = 'Password must be at least 8 characters long',

  // 401 Unauthorized
  UNAUTHORIZED = 'Authentication required',
  INVALID_CREDENTIALS = 'Invalid email or password',
  TOKEN_EXPIRED = 'Token has expired',
  INVALID_TOKEN = 'Invalid authentication token',

  // 403 Forbidden
  FORBIDDEN = 'Access denied',
  INSUFFICIENT_PERMISSIONS = 'Insufficient permissions to perform this action',
  DIFFERENT_MERCHANT = 'You can only access resources from your own merchant',
  NOT_OWNER = 'You can only modify your own resources',

  // 404 Not Found
  USER_NOT_FOUND = 'User not found',
  COMPANY_NOT_FOUND = 'Company not found',
  MERCHANT_NOT_FOUND = 'Merchant not found',
  RESOURCE_NOT_FOUND = 'Requested resource not found',
  APPLICATION_NOT_FOUND = 'Application not found',
  MERCHANT_SUBSCRIPTION_NOT_FOUND = 'Merchant subscription not found',
  PLAN_APPLICATION_NOT_FOUND = 'Plan Application not found',
  SUBSCRIPTION_PLAN_NOT_FOUND = 'Subscription Plan not found',

  // 409 Conflict
  EMAIL_ALREADY_EXISTS = 'Email address is already registered',
  USERNAME_ALREADY_EXISTS = 'Username is already taken',
  COMPANY_NAME_EXISTS = 'Company name already exists',
  MERCHANT_NAME_EXISTS = 'Merchant name already exists',
  RUT_ALREADY_EXISTS = 'RUT is already registered',
  DUPLICATE_RESOURCE = 'Resource already exists',

  // 422 Unprocessable Entity
  VALIDATION_FAILED = 'Validation failed',
  BUSINESS_RULE_VIOLATION = 'Business rule violation',
  INVALID_RELATIONSHIP = 'Invalid relationship between entities',

  // 500 Internal Server Error
  INTERNAL_ERROR = 'Internal server error',
  DATABASE_ERROR = 'Database operation failed',
  EXTERNAL_SERVICE_ERROR = 'External service unavailable',
}

export enum HttpErrorCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
}
