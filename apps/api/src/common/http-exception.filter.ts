import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/** The one error shape every API response uses. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

const CODE_BY_STATUS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

/**
 * Turns every thrown error into ApiErrorBody. Unknown errors become a 500 with a
 * generic message; their detail goes to the log only, never to the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();
    const requestId = typeof req.id === 'string' ? req.id : undefined;

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ApiErrorBody['error'] = {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
    };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      const raw =
        typeof response === 'object' && response !== null ? response : {};
      const rawMessage = (raw as { message?: unknown }).message;

      body = {
        code: CODE_BY_STATUS[status] ?? `HTTP_${status}`,
        message: exception.message,
      };

      // ValidationPipe puts a list of field problems in `message`.
      if (Array.isArray(rawMessage)) {
        body = {
          code: 'VALIDATION_FAILED',
          message: 'Some fields are invalid.',
          details: rawMessage,
        };
      } else if (typeof rawMessage === 'string') {
        body.message = rawMessage;
      }

      // 5xx messages can carry internal detail (e.g. a wrapped driver error).
      // Log it, but give the client only the generic text.
      if (status >= 500) {
        this.logger.error(exception.stack ?? exception.message);
        body = {
          code: CODE_BY_STATUS[status] ?? 'INTERNAL_ERROR',
          message: 'Something went wrong. Please try again.',
        };
      }
    } else {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (requestId) body.requestId = requestId;
    res.status(status).json({ error: body } satisfies ApiErrorBody);
  }
}
