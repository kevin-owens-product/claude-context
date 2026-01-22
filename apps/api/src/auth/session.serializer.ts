/**
 * @prompt-id forge-v4.1:api:auth:session:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';

@Injectable()
export class SessionSerializer extends PassportSerializer {
  serializeUser(user: any, done: (err: Error | null, user: any) => void) {
    done(null, {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });
  }

  deserializeUser(payload: any, done: (err: Error | null, user: any) => void) {
    done(null, payload);
  }
}
