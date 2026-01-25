/**
 * Symbols Module - Symbol analysis API module
 * @prompt-id forge-v4.1:api:symbols-module:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { Module } from '@nestjs/common';
import { SymbolsController } from './symbols.controller';

@Module({
  controllers: [SymbolsController],
  providers: [],
})
export class SymbolsModule {}
