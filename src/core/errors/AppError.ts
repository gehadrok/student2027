/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Base class for all application errors.
 * Every service must throw AppError-derived exceptions.
 * No raw Error() usage in business code.
 */
export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Validation error — input data failed validation rules.
 */
export class ValidationError extends AppError {
  public readonly fieldErrors: Array<{ field: string; message: string }>;

  constructor(
    message: string = 'Validation failed',
    fieldErrors: Array<{ field: string; message: string }> = []
  ) {
    super(message, 'VALIDATION_ERROR', 400, true);
    this.fieldErrors = fieldErrors;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      fieldErrors: this.fieldErrors,
    };
  }
}

/**
 * Business error — a business rule was violated.
 */
export class BusinessError extends AppError {
  constructor(message: string, code: string = 'BUSINESS_ERROR') {
    super(message, code, 409, true);
  }
}

/**
 * Database error — a database operation failed.
 */
export class DatabaseError extends AppError {
  public readonly cause?: Error;

  constructor(message: string = 'Database operation failed', cause?: Error) {
    super(message, 'DATABASE_ERROR', 500, false);
    this.cause = cause;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      cause: this.cause?.message,
    };
  }
}

/**
 * Permission error — user lacks required permissions.
 */
export class PermissionError extends AppError {
  constructor(
    message: string = 'Insufficient permissions',
    code: string = 'PERMISSION_ERROR'
  ) {
    super(message, code, 403, true);
  }
}

/**
 * Authentication error — user is not authenticated.
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401, true);
  }
}

/**
 * Authorization error — user is authenticated but not authorized.
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Not authorized') {
    super(message, 'AUTHORIZATION_ERROR', 403, true);
  }
}

/**
 * Configuration error — application configuration is invalid.
 */
export class ConfigurationError extends AppError {
  constructor(message: string = 'Invalid configuration') {
    super(message, 'CONFIGURATION_ERROR', 500, false);
  }
}

/**
 * File storage error — file storage operation failed.
 */
export class FileStorageError extends AppError {
  constructor(message: string = 'File storage operation failed') {
    super(message, 'FILE_STORAGE_ERROR', 500, false);
  }
}

/**
 * Network error — a network request failed.
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed') {
    super(message, 'NETWORK_ERROR', 503, false);
  }
}

/**
 * Unknown error — an unexpected error occurred.
 */
export class UnknownError extends AppError {
  constructor(
    message: string = 'An unexpected error occurred',
    cause?: Error
  ) {
    super(message, 'UNKNOWN_ERROR', 500, false);
    if (cause && this.stack) {
      this.stack += `\nCaused by: ${cause.stack}`;
    }
  }
}
