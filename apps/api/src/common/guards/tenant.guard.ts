/**
 * @prompt-id forge-v4.1:api:guards:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

// Demo UUIDs for development without authentication
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    // In demo/development mode, inject demo user if no user is present
    if (!request.user && process.env.NODE_ENV !== 'production') {
      request.user = {
        id: DEMO_USER_ID,
        tenantId: DEMO_TENANT_ID,
        email: 'demo@example.com',
        role: 'admin',
      };
    }

    const user = request.user;

    if (!user?.tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    return true;
  }
}
