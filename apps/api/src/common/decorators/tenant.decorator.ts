/**
 * @prompt-id forge-v4.1:api:decorators:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantId, UserId } from '@forge/context';

export interface RequestUser {
  id: UserId;
  tenantId: TenantId;
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

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantId => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);

export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserId => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id;
  },
);
