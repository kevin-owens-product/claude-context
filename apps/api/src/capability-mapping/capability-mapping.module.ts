/**
 * Capability Mapping Module
 * @prompt-id forge-v4.1:api:capability-mapping-module:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { CapabilityMappingController } from './capability-mapping.controller';

@Module({
  controllers: [CapabilityMappingController],
  providers: [],
})
export class CapabilityMappingModule {}
