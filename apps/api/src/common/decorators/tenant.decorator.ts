/**
 * @prompt-id forge-v4.1:api:decorators:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantId as TenantIdType, UserId as UserIdType } from '@forge/context';

export interface RequestUser {
  id: UserIdType;
  tenantId: TenantIdType;
  email: string;
  role: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | unknown => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);

// Demo UUIDs for development without authentication
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001' as TenantIdType;
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001' as UserIdType;

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantIdType => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId || DEMO_TENANT_ID;
  },
);

export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserIdType => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id || DEMO_USER_ID;
  },
);

export interface TenantContextData {
  tenantId: TenantIdType;
  userId: UserIdType;
}

export const TenantContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContextData => {
    const request = ctx.switchToHttp().getRequest();
    return {
      tenantId: request.user?.tenantId || DEMO_TENANT_ID,
      userId: request.user?.id || DEMO_USER_ID,
    };
  },
);
