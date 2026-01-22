/**
 * @prompt-id forge-v4.1:api:auth:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 *
 * Enterprise Authentication Module
 *
 * Provides comprehensive authentication supporting:
 * - Email/Password with MFA
 * - SSO/SAML 2.0 (Okta, Azure AD, OneLogin)
 * - OIDC (Google Workspace, GitHub)
 * - API Keys for programmatic access
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { SessionSerializer } from './session.serializer';

@Module({
  imports: [
    PassportModule.register({
      session: true,
      defaultStrategy: 'jwt',
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me-in-production',
      signOptions: {
        expiresIn: '24h',
        issuer: 'claude-context',
        audience: 'claude-context-api',
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    ApiKeyStrategy,
    LocalStrategy,
    SessionSerializer,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
