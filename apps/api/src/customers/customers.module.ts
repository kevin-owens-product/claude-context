/**
 * Customers Module - NestJS module for customer management
 * @prompt-id forge-v4.1:api:module:customers:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomerService } from '@forge/context';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

@Module({
  controllers: [CustomersController],
  providers: [
    {
      provide: CustomerService,
      useFactory: (prisma: PrismaClient, redis: Redis) => {
        return new CustomerService(prisma, redis);
      },
      inject: ['PRISMA_CLIENT', 'REDIS_CLIENT'],
    },
  ],
  exports: [CustomerService],
})
export class CustomersModule {}
