/**
 * @prompt-id forge-v4.1:api:module:database:001
 * @generated-at 2026-01-22T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module, Global, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { PrismaService } from './prisma.service';

/**
 * In-memory Redis mock for development when Redis isn't available
 */
class InMemoryRedis {
  private cache = new Map<string, { value: string; expiry?: number }>();
  private hashCache = new Map<string, Map<string, string>>();
  private logger = new Logger('InMemoryRedis');

  constructor() {
    this.logger.warn('Using in-memory cache - Redis is not available');
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.cache.set(key, { value });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.cache.set(key, { value, expiry: Date.now() + seconds * 1000 });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) deleted++;
      if (this.hashCache.delete(key)) deleted++;
    }
    return deleted;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const stringKeys = Array.from(this.cache.keys()).filter(k => regex.test(k));
    const hashKeys = Array.from(this.hashCache.keys()).filter(k => regex.test(k));
    return [...new Set([...stringKeys, ...hashKeys])];
  }

  async quit(): Promise<'OK'> {
    this.cache.clear();
    this.hashCache.clear();
    return 'OK';
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  // Hash operations for feedback service
  async hget(key: string, field: string): Promise<string | null> {
    const hash = this.hashCache.get(key);
    if (!hash) return null;
    return hash.get(field) ?? null;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    let hash = this.hashCache.get(key);
    if (!hash) {
      hash = new Map();
      this.hashCache.set(key, hash);
    }
    const isNew = !hash.has(field);
    hash.set(field, value);
    return isNew ? 1 : 0;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    let hash = this.hashCache.get(key);
    if (!hash) {
      hash = new Map();
      this.hashCache.set(key, hash);
    }
    const current = parseInt(hash.get(field) ?? '0', 10);
    const newValue = current + increment;
    hash.set(field, String(newValue));
    return newValue;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const hash = this.hashCache.get(key);
    if (!hash) return {};
    return Object.fromEntries(hash);
  }
}

async function createRedisClient(): Promise<Redis | InMemoryRedis> {
  const logger = new Logger('DatabaseModule');

  // Skip Redis connection in test environment or when explicitly disabled
  if (process.env.SKIP_REDIS === 'true' || process.env.NODE_ENV === 'test') {
    return new InMemoryRedis() as any;
  }

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 1) {
        return null; // Stop retrying
      }
      return 100; // Retry after 100ms
    },
  });

  // Suppress error events - we'll handle the failure gracefully
  redis.on('error', () => {});

  try {
    await redis.connect();
    await redis.ping();
    logger.log('Connected to Redis');
    return redis;
  } catch {
    logger.warn('Redis not available - falling back to in-memory cache');
    redis.disconnect();
    return new InMemoryRedis() as any;
  }
}

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: 'PRISMA_CLIENT',
      useFactory: () => {
        const prisma = new PrismaClient({
          log:
            process.env.NODE_ENV === 'development'
              ? ['query', 'info', 'warn', 'error']
              : ['error'],
        });
        return prisma;
      },
    },
    {
      provide: 'REDIS_CLIENT',
      useFactory: async () => {
        return await createRedisClient();
      },
    },
    {
      provide: 'FEEDBACK_QUEUE',
      useFactory: () => {
        if (process.env.ENABLE_FEEDBACK_QUEUE !== 'true') {
          return null;
        }
        return new Queue('feedback', {
          connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD || undefined,
          },
        });
      },
    },
  ],
  exports: [PrismaService, 'PRISMA_CLIENT', 'REDIS_CLIENT', 'FEEDBACK_QUEUE'],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(
    @Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient,
    @Inject('REDIS_CLIENT') private readonly redis: Redis | InMemoryRedis,
  ) {}

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.redis.quit();
  }
}
