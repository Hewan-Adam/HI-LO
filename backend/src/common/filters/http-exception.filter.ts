import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = this.extractMessage(exceptionResponse, exception, status);

    const body: ErrorResponseBody = {
      statusCode: status,
      error: isHttpException ? exception.constructor.name.replace('Exception', '') : 'InternalServerError',
      message,
      path: request?.url ?? 'unknown',
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      // Full detail (including stack) goes to the server log only — never to the client.
      this.logger.error(`${request?.method ?? ''} ${request?.url ?? ''} -> 500`, exception instanceof Error ? exception.stack : String(exception));
      body.message = 'An unexpected error occurred';
    }

    response.status(status).json(body);
  }

  private extractMessage(exceptionResponse: unknown, exception: unknown, status: number): string | string[] {
    if (status >= 500) return 'An unexpected error occurred';
    if (typeof exceptionResponse === 'string') return exceptionResponse;
    if (exceptionResponse && typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
      return (exceptionResponse as { message: string | string[] }).message;
    }
    return exception instanceof Error ? exception.message : 'Unknown error';
  }
}
