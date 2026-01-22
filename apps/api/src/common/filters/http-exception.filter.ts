/**
 * @prompt-id forge-v4.1:api:filters:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  GraphNotFoundError,
  NodeNotFoundError,
  SliceNotFoundError,
  SessionNotFoundError,
  InvalidSliceTransitionError,
  AcceptanceCriteriaIncompleteError,
  SelfApprovalNotAllowedError,
  SliceReopenWindowExpiredError,
  TokenBudgetExceededError,
  NoContextAvailableError,
  FeedbackAlreadySubmittedError,
} from '@forge/context';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, body } = this.mapException(exception);

    this.logger.error(
      `Exception: ${body.error}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json(body);
  }

  private mapException(exception: unknown): {
    status: number;
    body: { error: string; message: string; details?: unknown };
  } {
    // HTTP exceptions
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      return {
        status: exception.getStatus(),
        body: {
          error: exception.name,
          message: typeof response === 'string' ? response : (response as { message: string }).message,
          details: typeof response === 'object' ? response : undefined,
        },
      };
    }

    // Domain errors - Not Found
    if (
      exception instanceof GraphNotFoundError ||
      exception instanceof NodeNotFoundError ||
      exception instanceof SliceNotFoundError ||
      exception instanceof SessionNotFoundError
    ) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          error: exception.name,
          message: exception.message,
        },
      };
    }

    // Domain errors - Bad Request
    if (
      exception instanceof InvalidSliceTransitionError ||
      exception instanceof AcceptanceCriteriaIncompleteError ||
      exception instanceof TokenBudgetExceededError ||
      exception instanceof NoContextAvailableError
    ) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          error: exception.name,
          message: exception.message,
        },
      };
    }

    // Domain errors - Forbidden
    if (exception instanceof SelfApprovalNotAllowedError) {
      return {
        status: HttpStatus.FORBIDDEN,
        body: {
          error: exception.name,
          message: exception.message,
        },
      };
    }

    // Domain errors - Conflict
    if (
      exception instanceof SliceReopenWindowExpiredError ||
      exception instanceof FeedbackAlreadySubmittedError
    ) {
      return {
        status: HttpStatus.CONFLICT,
        body: {
          error: exception.name,
          message: exception.message,
        },
      };
    }

    // Unknown errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
    };
  }
}
