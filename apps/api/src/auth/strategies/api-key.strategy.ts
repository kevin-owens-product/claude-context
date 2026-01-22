/**
 * @prompt-id forge-v4.1:api:auth:apikey:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(token: string) {
    // Check if it's an API key (starts with cc_)
    if (!token.startsWith('cc_')) {
      throw new UnauthorizedException('Invalid token format');
    }

    try {
      return await this.authService.validateApiKey(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
