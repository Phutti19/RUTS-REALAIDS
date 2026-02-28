import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { DatabaseService } from '../../database/db.service';
import { RequestUser } from '../decorators/current-user.decorator';

// Skip read-only and non-user requests
const SKIP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * AuditLogInterceptor — writes a record to audit_logs for every
 * mutating request (POST, PUT, PATCH, DELETE) made by an authenticated user.
 *
 * Apply selectively:
 *   @UseInterceptors(AuditLogInterceptor)
 *
 * Or register globally in AppModule providers (with DatabaseService injected).
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly db: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();

    const { method, url, user, body } = request;

    if (SKIP_METHODS.has(method) || !user) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: async () => {
          try {
            await this.db.query(
              `INSERT INTO audit_logs
                (user_id, action, entity_type, entity_id, new_values)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                user.id,
                method,
                this.extractEntityType(url),
                this.extractEntityId(url),
                JSON.stringify(body ?? {}),
              ],
            );
          } catch (err: unknown) {
            // Never let audit logging break the main flow
            this.logger.error(
              `Audit log write failed: ${(err as Error).message}`,
            );
          }
        },
      }),
    );
  }

  /** Extract entity type from URL: /api/v1/incidents/123 → incidents */
  private extractEntityType(url: string): string {
    return url.replace(/\/api\/v1\//, '').split('/')[0] ?? 'unknown';
  }

  /** Extract entity ID from URL: /api/v1/incidents/123 → 123 */
  private extractEntityId(url: string): string | null {
    const parts = url.replace(/\/api\/v1\//, '').split('/');
    return parts[1] ?? null;
  }
}
