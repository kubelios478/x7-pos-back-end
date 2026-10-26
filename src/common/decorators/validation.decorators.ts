// src/common/decorators/validation.decorators.ts
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsValidRUT(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidRUT',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;

          // Remove dots and hyphens
          const cleanRUT = value.replace(/[.-]/g, '');

          // Basic format validation (7-8 digits + check digit)
          if (!/^\d{7,8}[0-9kK]$/.test(cleanRUT)) return false;

          // Extract number and check digit
          const body = cleanRUT.slice(0, -1);
          const checkDigit = cleanRUT.slice(-1).toUpperCase();

          // Calculate check digit
          let sum = 0;
          let multiplier = 2;

          for (let i = body.length - 1; i >= 0; i--) {
            sum += parseInt(body[i]) * multiplier;
            multiplier = multiplier === 7 ? 2 : multiplier + 1;
          }

          const remainder = sum % 11;
          const calculatedCheckDigit =
            remainder < 2
              ? remainder.toString()
              : 11 - remainder === 10
                ? 'K'
                : (11 - remainder).toString();

          return checkDigit === calculatedCheckDigit;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid RUT format (e.g., 12.345.678-9)`;
        },
      },
    });
  };
}

/** Country-neutral tax ID shape: e.g. EIN 12-3456789, RUT 12.345.678-K, VAT DE123456789. */
export const TAX_ID_PATTERN =
  /^(?=.*\d)[A-Za-z0-9](?:[A-Za-z0-9.\-/ ]{0,48}[A-Za-z0-9])?$/;

/**
 * Validates a tax identifier without assuming any country's format: letters and digits,
 * optionally separated by dots, hyphens, slashes or spaces, with at least one digit.
 */
export function IsTaxId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isTaxId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && TAX_ID_PATTERN.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid tax ID (e.g. EIN 12-3456789)`;
        },
      },
    });
  };
}

export function IsBusinessEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBusinessEmail',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;

          // Basic email format check
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) return false;

          // Exclude common personal email providers
          const personalProviders = [
            'gmail.com',
            'yahoo.com',
            'hotmail.com',
            'outlook.com',
            'live.com',
            'icloud.com',
            'aol.com',
            'protonmail.com',
            'mail.com',
            'yandex.com',
          ];

          const domain = value.split('@')[1].toLowerCase();
          return !personalProviders.includes(domain);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} should be a business email address (personal email providers are not allowed)`;
        },
      },
    });
  };
}
