/**
 * @prompt-id forge-v4.1:api:auth:002
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

export interface TokenPayload {
  sub: string; // userId
  userId?: string; // alias for sub
  tenantId: string;
  email: string;
  role: string;
  permissions: string[];
  type: 'access' | 'refresh' | 'api_key';
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

// Permission definitions
export const Permissions = {
  // Context
  CONTEXT_READ: 'context:read',
  CONTEXT_WRITE: 'context:write',
  CONTEXT_DELETE: 'context:delete',
  CONTEXT_ADMIN: 'context:admin',
  // Slices
  SLICE_READ: 'slice:read',
  SLICE_CREATE: 'slice:create',
  SLICE_TRANSITION: 'slice:transition',
  SLICE_DELETE: 'slice:delete',
  // Team
  TEAM_MANAGE: 'team:manage',
  TEAM_INVITE: 'team:invite',
  // Admin
  ADMIN_BILLING: 'admin:billing',
  ADMIN_SETTINGS: 'admin:settings',
  ADMIN_AUDIT: 'admin:audit',
} as const;

// Role to permissions mapping
export const RolePermissions: Record<string, string[]> = {
  VIEWER: [Permissions.CONTEXT_READ, Permissions.SLICE_READ],
  MEMBER: [
    Permissions.CONTEXT_READ,
    Permissions.CONTEXT_WRITE,
    Permissions.SLICE_READ,
    Permissions.SLICE_CREATE,
    Permissions.SLICE_TRANSITION,
  ],
  ADMIN: [
    Permissions.CONTEXT_READ,
    Permissions.CONTEXT_WRITE,
    Permissions.CONTEXT_DELETE,
    Permissions.SLICE_READ,
    Permissions.SLICE_CREATE,
    Permissions.SLICE_TRANSITION,
    Permissions.SLICE_DELETE,
    Permissions.TEAM_MANAGE,
    Permissions.TEAM_INVITE,
  ],
  OWNER: Object.values(Permissions),
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Verify and decode JWT token
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token);
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Authenticate user with email and password
   */
  async validateUser(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // In production, use proper password hashing
    const isValid = await bcrypt.compare(password, user.passwordHash || '');
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<TokenPayload> {
    // Hash the API key to look up
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          include: { tenant: true },
        },
      },
    });

    if (!key || !key.isActive || (key.expiresAt && key.expiresAt < new Date())) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Update last used timestamp
    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      sub: key.user.id,
      userId: key.user.id,
      tenantId: key.user.tenantId,
      email: key.user.email,
      role: key.user.role,
      permissions: key.permissions || RolePermissions[key.user.role] || [],
      type: 'api_key',
    };
  }

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(user: any): Promise<AuthResult> {
    const permissions = RolePermissions[user.role] || [];

    const payload: TokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      permissions,
      type: 'access',
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      { expiresIn: '7d' }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResult> {
    try {
      const payload = this.jwtService.verify<TokenPayload>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { tenant: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Create API key for user
   */
  async createApiKey(
    userId: string,
    name: string,
    permissions?: string[],
    expiresAt?: Date
  ): Promise<{ key: string; id: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate a secure API key
    const rawKey = `cc_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // Use user's permissions if not specified
    const keyPermissions = permissions || RolePermissions[user.role] || [];

    const apiKey = await this.prisma.apiKey.create({
      data: {
        name,
        keyHash,
        keyPrefix: rawKey.substring(0, 10),
        userId,
        permissions: keyPermissions,
        expiresAt,
      },
    });

    // Only return the raw key once - it cannot be retrieved later
    return { key: rawKey, id: apiKey.id };
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!key) {
      throw new ForbiddenException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });
  }

  /**
   * List user's API keys
   */
  async listApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Check if user has permission
   */
  hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Check if user has any of the required permissions
   */
  hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some((p) => userPermissions.includes(p));
  }

  /**
   * Check if user has all required permissions
   */
  hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every((p) => userPermissions.includes(p));
  }
}
