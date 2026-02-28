import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const HTTP_ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * GlobalExceptionFilter — formats ALL errors into the standard API shape:
 *   { success: false, error: "ERROR_CODE", message: "...", timestamp, path }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let validationErrors: unknown[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const bodyObj = body as Record<string, unknown>;
        // class-validator returns { message: string[] } for validation errors
        if (Array.isArray(bodyObj.message)) {
          validationErrors = bodyObj.message as unknown[];
          message = 'Validation failed';
        } else {
          message = (bodyObj.message as string) || message;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    const errorCode = HTTP_ERROR_CODES[status] ?? 'INTERNAL_SERVER_ERROR';

    this.logger.warn(
      `${request.method} ${request.url} → ${status} ${errorCode}: ${message}`,
    );

    const responseBody: Record<string, unknown> = {
      success: false,
      error: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (validationErrors) {
      responseBody.errors = validationErrors;
    }

    response.status(status).json(responseBody);
  }
}
