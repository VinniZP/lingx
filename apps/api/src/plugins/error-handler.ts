import type { FieldError } from '@lingx/shared';
import { FastifyError, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Standard error response structure for consistent API error handling
 */
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
  fieldErrors?: FieldError[];
}

/**
 * Base application error class
 *
 * Custom application errors should extend this class to ensure
 * consistent error handling and response formatting.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error thrown when a requested resource is not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Error thrown when request validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * Error thrown for bad/invalid requests
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
  }
}

/**
 * Error thrown when authentication is required but not provided or invalid
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Error thrown when user lacks permission to access a resource
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Error thrown when field-level validation fails (e.g., unique constraint violations)
 * Returns detailed field-level errors to the client for form display
 */
export class FieldValidationError extends AppError {
  public readonly fieldErrors: FieldError[];

  constructor(fieldErrors: FieldError[], message?: string) {
    super(message || 'Validation failed', 409, 'FIELD_VALIDATION_ERROR');
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Error Handler Plugin
 *
 * Sets up global error handling for the Fastify application.
 * Handles custom AppError instances, Fastify validation errors,
 * and unexpected errors with appropriate logging and response formatting.
 */
const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    const response: ErrorResponse = {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    };

    // Handle FieldValidationError (field-level errors)
    // Check both instanceof and duck-typing for fieldErrors property
    const isFieldValidationError =
      error instanceof FieldValidationError ||
      (error instanceof AppError &&
        'fieldErrors' in error &&
        Array.isArray((error as FieldValidationError).fieldErrors));

    if (isFieldValidationError) {
      const fieldError = error as FieldValidationError;
      response.statusCode = fieldError.statusCode;
      response.error = fieldError.code;
      response.message = fieldError.message;
      response.code = fieldError.code;
      response.fieldErrors = fieldError.fieldErrors;

      fastify.log.info(
        {
          err: error,
          fieldErrors: fieldError.fieldErrors,
          request: {
            method: request.method,
            url: request.url,
          },
        },
        'Field validation error'
      );
    }
    // Handle AppError (our custom errors)
    else if (error instanceof AppError) {
      response.statusCode = error.statusCode;
      response.error = error.code;
      response.message = error.message;
      response.code = error.code;

      fastify.log.warn(
        {
          err: error,
          request: {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query,
          },
        },
        'Application error'
      );
    }
    // Handle Fastify validation errors
    else if (error.validation) {
      response.statusCode = 400;
      response.error = 'VALIDATION_ERROR';
      response.message = error.message;
      response.code = 'VALIDATION_ERROR';

      fastify.log.info(
        {
          err: error,
          validation: error.validation,
        },
        'Validation error'
      );
    }
    // Handle other errors
    else {
      // Log unexpected errors with full context
      fastify.log.error(
        {
          err: error,
          request: {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query,
          },
        },
        'Unexpected error'
      );

      // In production, don't expose error details
      if (process.env.NODE_ENV === 'production') {
        response.message = 'An unexpected error occurred';
      } else {
        response.message = error.message;
      }
    }

    return reply.status(response.statusCode).send(response);
  });

  // Handle 404s
  fastify.setNotFoundHandler((request, reply) => {
    return reply.status(404).send({
      statusCode: 404,
      error: 'NOT_FOUND',
      message: `Route ${request.method}:${request.url} not found`,
      code: 'ROUTE_NOT_FOUND',
    });
  });
};

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
});
