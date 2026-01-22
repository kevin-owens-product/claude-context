# ADR-027: Autonomous Build Infrastructure

**Status:** Accepted
**Date:** January 2026
**Deciders:** Platform & DevOps Team
**Categories:** Automation, CI/CD, Developer Experience

## Context

To achieve truly autonomous development with Claude Code and the Claude ecosystem, we need infrastructure that:

1. **Automates quality gates** - Build, lint, test, security scanning
2. **Provides learning feedback** - Captures errors and solutions for future sessions
3. **Enables skill reuse** - Common patterns as reusable skills
4. **Supports hooks** - Pre/post actions for key development events
5. **Maintains standards** - Enforces conventions automatically

### Current Gaps

| Gap | Impact |
|-----|--------|
| No pre-commit hooks | Bad code reaches commits |
| No automated testing | Regressions go unnoticed |
| No skill library | Reinventing solutions each session |
| No learning loop | Same errors repeated |
| Manual quality checks | Inconsistent enforcement |

## Decision

**We will implement a comprehensive automation infrastructure with hooks, skills, and a learning system.**

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS BUILD INFRASTRUCTURE                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEVELOPER WORKFLOW                                 │
│                                                                             │
│   Code Change → Pre-commit → Build → Test → Lint → Security → Commit       │
│        │            │          │       │       │        │         │         │
│        ▼            ▼          ▼       ▼       ▼        ▼         ▼         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        HOOK SYSTEM                                   │   │
│   │  • pre-commit    • post-build    • pre-test    • post-test          │   │
│   │  • pre-push      • post-deploy   • on-error    • on-success         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
         ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
         │  SKILLS LIBRARY │ │ LEARNING SYSTEM │ │ QUALITY GATES   │
         │                 │ │                 │ │                 │
         │ • Code patterns │ │ • Error catalog │ │ • Type checking │
         │ • Test helpers  │ │ • Solutions DB  │ │ • Linting       │
         │ • API templates │ │ • Best practices│ │ • Security scan │
         │ • Schema tools  │ │ • Anti-patterns │ │ • Test coverage │
         └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 1. Hook System

```typescript
// .claude/hooks/config.ts
export interface HookConfig {
  hooks: {
    'pre-commit': Hook[];
    'post-commit': Hook[];
    'pre-push': Hook[];
    'pre-build': Hook[];
    'post-build': Hook[];
    'pre-test': Hook[];
    'post-test': Hook[];
    'on-error': Hook[];
    'on-success': Hook[];
  };
}

export interface Hook {
  name: string;
  command?: string;
  script?: string;
  condition?: string;
  continueOnError?: boolean;
  timeout?: number;
}

// Default hook configuration
export const defaultHooks: HookConfig = {
  hooks: {
    'pre-commit': [
      { name: 'lint', command: 'pnpm lint' },
      { name: 'type-check', command: 'pnpm tsc --noEmit' },
      { name: 'format', command: 'pnpm prettier --check .' },
      { name: 'no-secrets', script: 'check-secrets.sh' },
    ],
    'post-commit': [
      { name: 'update-changelog', script: 'update-changelog.sh', condition: 'branch != main' },
    ],
    'pre-push': [
      { name: 'test', command: 'pnpm test' },
      { name: 'build', command: 'pnpm build' },
    ],
    'pre-build': [
      { name: 'clean', command: 'pnpm clean' },
      { name: 'generate', command: 'pnpm prisma generate' },
    ],
    'post-build': [
      { name: 'bundle-analyze', command: 'pnpm analyze', condition: 'CI=true' },
    ],
    'pre-test': [
      { name: 'db-reset', command: 'pnpm prisma migrate reset --force', condition: 'CI=true' },
    ],
    'post-test': [
      { name: 'coverage-report', command: 'pnpm coverage:report' },
    ],
    'on-error': [
      { name: 'capture-error', script: 'capture-error.sh' },
      { name: 'notify', script: 'notify-failure.sh', condition: 'CI=true' },
    ],
    'on-success': [
      { name: 'record-success', script: 'record-success.sh' },
    ],
  },
};
```

### 2. Skills Library

```typescript
// .claude/skills/index.ts
export interface Skill {
  name: string;
  description: string;
  category: SkillCategory;
  trigger: SkillTrigger;
  action: SkillAction;
  examples?: string[];
}

type SkillCategory =
  | 'code-generation'
  | 'testing'
  | 'debugging'
  | 'refactoring'
  | 'documentation'
  | 'api-design'
  | 'database'
  | 'security';

type SkillTrigger = {
  type: 'pattern' | 'command' | 'file-type' | 'error';
  value: string;
};

type SkillAction = {
  type: 'template' | 'script' | 'prompt';
  content: string;
};

// Skills library
export const skills: Skill[] = [
  // Code Generation Skills
  {
    name: 'create-nestjs-module',
    description: 'Create a complete NestJS module with controller, service, and tests',
    category: 'code-generation',
    trigger: { type: 'command', value: 'create module' },
    action: {
      type: 'template',
      content: `
// {{name}}.module.ts
@Module({
  imports: [DatabaseModule],
  controllers: [{{Name}}Controller],
  providers: [{{Name}}Service],
  exports: [{{Name}}Service],
})
export class {{Name}}Module {}

// {{name}}.service.ts
@Injectable()
export class {{Name}}Service {
  constructor(private prisma: PrismaService) {}
}

// {{name}}.controller.ts
@Controller('{{kebab-name}}')
@UseGuards(JwtAuthGuard)
export class {{Name}}Controller {
  constructor(private readonly service: {{Name}}Service) {}
}

// {{name}}.service.spec.ts
describe('{{Name}}Service', () => {
  let service: {{Name}}Service;
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [{{Name}}Service, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get({{Name}}Service);
  });
  it('should be defined', () => expect(service).toBeDefined());
});
      `,
    },
  },

  // Testing Skills
  {
    name: 'create-integration-test',
    description: 'Create integration test with database setup',
    category: 'testing',
    trigger: { type: 'command', value: 'create integration test' },
    action: {
      type: 'template',
      content: `
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';

describe('{{Name}} Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.$executeRaw\`TRUNCATE TABLE {{table}} CASCADE\`;
  });

  describe('GET /{{endpoint}}', () => {
    it('should return 200', async () => {
      const response = await request(app.getHttpServer())
        .get('/{{endpoint}}')
        .set('Authorization', 'Bearer {{token}}');
      expect(response.status).toBe(200);
    });
  });
});
      `,
    },
  },

  // API Design Skills
  {
    name: 'create-rest-endpoint',
    description: 'Create REST endpoint with validation and error handling',
    category: 'api-design',
    trigger: { type: 'command', value: 'create endpoint' },
    action: {
      type: 'template',
      content: `
// DTO
export class Create{{Name}}Dto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// Controller method
@Post()
@HttpCode(HttpStatus.CREATED)
async create(
  @Request() req: AuthenticatedRequest,
  @Body() dto: Create{{Name}}Dto,
): Promise<{{Name}}Response> {
  return this.service.create(req.user.tenantId, dto);
}

// Service method
async create(tenantId: string, dto: Create{{Name}}Dto): Promise<{{Name}}> {
  return this.prisma.{{model}}.create({
    data: {
      id: uuidv4(),
      tenantId,
      ...dto,
    },
  });
}
      `,
    },
  },

  // Database Skills
  {
    name: 'create-prisma-model',
    description: 'Create Prisma model with standard fields',
    category: 'database',
    trigger: { type: 'command', value: 'create model' },
    action: {
      type: 'template',
      content: `
model {{Name}} {
  id        String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid

  // Fields
  name      String   @db.VarChar(255)

  // Version tracking
  version   Int      @default(1)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  createdById String? @map("created_by_id") @db.Uuid
  updatedById String? @map("updated_by_id") @db.Uuid

  // Soft delete
  deletedAt DateTime? @map("deleted_at")

  @@index([tenantId])
  @@index([tenantId, version])
  @@map("{{table_name}}")
}
      `,
    },
  },

  // Error Handling Skills
  {
    name: 'fix-typescript-implicit-any',
    description: 'Fix implicit any type errors',
    category: 'debugging',
    trigger: { type: 'error', value: 'TS7006' },
    action: {
      type: 'prompt',
      content: `
The TypeScript error TS7006 indicates a parameter has an implicit 'any' type.

To fix:
1. Add explicit type annotation to the parameter
2. If the type is complex, create an interface
3. If truly any type, use explicit 'any' or 'unknown'

Example fix:
// Before
items.map(item => item.name)

// After
items.map((item: ItemType) => item.name)
      `,
    },
  },

  // Security Skills
  {
    name: 'add-authentication-guard',
    description: 'Add JWT authentication to endpoint',
    category: 'security',
    trigger: { type: 'pattern', value: '@Controller' },
    action: {
      type: 'template',
      content: `
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('{{path}}')
@UseGuards(JwtAuthGuard)
export class {{Name}}Controller {
  // All endpoints now require authentication
}
      `,
    },
  },
];
```

### 3. Learning System

```typescript
// .claude/learning/error-catalog.ts
export interface ErrorEntry {
  id: string;
  errorCode: string;
  errorMessage: string;
  context: string;
  solution: string;
  preventionTips: string[];
  relatedFiles: string[];
  occurrences: number;
  lastSeen: Date;
  resolvedBy?: string;
}

// .claude/learning/solutions-db.ts
export interface SolutionEntry {
  id: string;
  problem: string;
  solution: string;
  category: string;
  tags: string[];
  effectiveness: number; // 0-100
  usageCount: number;
  lastUsed: Date;
}

// Learning service
export class LearningService {
  private errorCatalog: Map<string, ErrorEntry> = new Map();
  private solutionsDb: Map<string, SolutionEntry> = new Map();

  async recordError(error: Error, context: string): Promise<void> {
    const errorKey = this.generateErrorKey(error);
    const existing = this.errorCatalog.get(errorKey);

    if (existing) {
      existing.occurrences++;
      existing.lastSeen = new Date();
    } else {
      this.errorCatalog.set(errorKey, {
        id: uuidv4(),
        errorCode: this.extractErrorCode(error),
        errorMessage: error.message,
        context,
        solution: '',
        preventionTips: [],
        relatedFiles: this.extractRelatedFiles(error),
        occurrences: 1,
        lastSeen: new Date(),
      });
    }

    await this.persistErrorCatalog();
  }

  async recordSolution(errorId: string, solution: string): Promise<void> {
    const error = this.errorCatalog.get(errorId);
    if (error) {
      error.solution = solution;
      error.resolvedBy = 'claude';
      await this.persistErrorCatalog();

      // Also add to solutions DB
      await this.addSolution({
        problem: error.errorMessage,
        solution,
        category: this.categorizeError(error),
        tags: this.extractTags(error),
      });
    }
  }

  async findSolution(error: Error): Promise<SolutionEntry | null> {
    const errorKey = this.generateErrorKey(error);
    const catalogEntry = this.errorCatalog.get(errorKey);

    if (catalogEntry?.solution) {
      return {
        id: catalogEntry.id,
        problem: catalogEntry.errorMessage,
        solution: catalogEntry.solution,
        category: this.categorizeError(catalogEntry),
        tags: [],
        effectiveness: 100,
        usageCount: catalogEntry.occurrences,
        lastUsed: catalogEntry.lastSeen,
      };
    }

    // Search solutions DB for similar problems
    return this.searchSimilarSolutions(error.message);
  }

  async getBestPractices(category: string): Promise<string[]> {
    const solutions = Array.from(this.solutionsDb.values())
      .filter(s => s.category === category)
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 10);

    return solutions.map(s => s.solution);
  }
}
```

### 4. Quality Gates

```typescript
// .claude/quality/gates.ts
export interface QualityGate {
  name: string;
  description: string;
  check: () => Promise<QualityResult>;
  required: boolean;
  autoFix?: () => Promise<void>;
}

export interface QualityResult {
  passed: boolean;
  score?: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file?: string;
  line?: number;
  suggestion?: string;
}

export const qualityGates: QualityGate[] = [
  {
    name: 'typescript',
    description: 'TypeScript type checking',
    required: true,
    check: async () => {
      const result = await exec('pnpm tsc --noEmit 2>&1');
      const errors = parseTypeScriptErrors(result.stdout);
      return {
        passed: errors.length === 0,
        issues: errors.map(e => ({
          severity: 'error',
          message: e.message,
          file: e.file,
          line: e.line,
        })),
      };
    },
  },
  {
    name: 'eslint',
    description: 'ESLint code quality',
    required: true,
    check: async () => {
      const result = await exec('pnpm eslint . --format json 2>&1');
      const issues = JSON.parse(result.stdout);
      return {
        passed: issues.every((f: any) => f.errorCount === 0),
        issues: issues.flatMap((f: any) =>
          f.messages.map((m: any) => ({
            severity: m.severity === 2 ? 'error' : 'warning',
            message: m.message,
            file: f.filePath,
            line: m.line,
          }))
        ),
      };
    },
    autoFix: async () => {
      await exec('pnpm eslint . --fix');
    },
  },
  {
    name: 'tests',
    description: 'Unit and integration tests',
    required: true,
    check: async () => {
      const result = await exec('pnpm test --coverage --json 2>&1');
      const coverage = JSON.parse(result.stdout);
      return {
        passed: coverage.success,
        score: coverage.coveragePercentage,
        issues: coverage.failures.map((f: any) => ({
          severity: 'error',
          message: f.message,
          file: f.file,
        })),
      };
    },
  },
  {
    name: 'security',
    description: 'Security vulnerability scan',
    required: true,
    check: async () => {
      const result = await exec('pnpm audit --json 2>&1');
      const audit = JSON.parse(result.stdout);
      return {
        passed: audit.metadata.vulnerabilities.high === 0 &&
                audit.metadata.vulnerabilities.critical === 0,
        issues: Object.values(audit.advisories).map((a: any) => ({
          severity: a.severity === 'critical' ? 'error' : 'warning',
          message: `${a.module_name}: ${a.title}`,
          suggestion: a.recommendation,
        })),
      };
    },
  },
  {
    name: 'coverage',
    description: 'Test coverage threshold',
    required: false,
    check: async () => {
      const coverage = await readCoverageReport();
      return {
        passed: coverage.total >= 80,
        score: coverage.total,
        issues: coverage.total < 80 ? [{
          severity: 'warning',
          message: `Coverage ${coverage.total}% is below 80% threshold`,
        }] : [],
      };
    },
  },
  {
    name: 'no-secrets',
    description: 'No secrets in code',
    required: true,
    check: async () => {
      const result = await exec('gitleaks detect --source . --no-git 2>&1');
      return {
        passed: result.exitCode === 0,
        issues: result.exitCode !== 0 ? [{
          severity: 'error',
          message: 'Potential secrets detected in codebase',
          suggestion: 'Run gitleaks detect for details',
        }] : [],
      };
    },
  },
];

// Quality gate runner
export async function runQualityGates(): Promise<{
  passed: boolean;
  results: Map<string, QualityResult>;
}> {
  const results = new Map<string, QualityResult>();
  let allPassed = true;

  for (const gate of qualityGates) {
    console.log(`Running quality gate: ${gate.name}...`);

    try {
      const result = await gate.check();
      results.set(gate.name, result);

      if (!result.passed && gate.required) {
        allPassed = false;

        // Try auto-fix if available
        if (gate.autoFix) {
          console.log(`Attempting auto-fix for ${gate.name}...`);
          await gate.autoFix();

          // Re-check
          const recheck = await gate.check();
          results.set(gate.name, recheck);
          if (recheck.passed) {
            allPassed = true;
          }
        }
      }
    } catch (error) {
      results.set(gate.name, {
        passed: false,
        issues: [{
          severity: 'error',
          message: `Gate failed to run: ${error}`,
        }],
      });
      if (gate.required) allPassed = false;
    }
  }

  return { passed: allPassed, results };
}
```

### 5. Claude Code Integration

```json
// .claude/settings.json
{
  "hooks": {
    "pre-tool-use": [
      {
        "matcher": "Write|Edit",
        "command": "node .claude/hooks/pre-write.js"
      }
    ],
    "post-tool-use": [
      {
        "matcher": "Write|Edit",
        "command": "node .claude/hooks/post-write.js"
      }
    ],
    "on-error": [
      {
        "command": "node .claude/hooks/on-error.js"
      }
    ]
  },
  "skills": {
    "path": ".claude/skills",
    "autoLoad": true
  },
  "quality": {
    "runOnSave": true,
    "gates": ["typescript", "eslint"]
  },
  "learning": {
    "enabled": true,
    "errorCatalogPath": ".claude/learning/errors.json",
    "solutionsDbPath": ".claude/learning/solutions.json"
  }
}
```

### 6. CI/CD Pipeline Integration

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, 'claude/**']
  pull_request:
    branches: [main]

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Run quality gates
        run: node .claude/quality/run-gates.js

      - name: Upload learning data
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: error-catalog
          path: .claude/learning/errors.json

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm prisma migrate deploy
      - run: pnpm test --coverage

  build:
    needs: [quality-gates, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm build
```

## Consequences

### Positive

- **Autonomous quality** - Automated enforcement of standards
- **Learning from errors** - Solutions captured and reused
- **Skill reuse** - Common patterns available instantly
- **Consistent output** - Same quality across all sessions
- **Faster development** - Less manual checking and fixing

### Negative

- **Initial setup** - Requires configuration effort
- **Maintenance** - Skills and learning need updates
- **Complexity** - More moving parts to understand

### Mitigations

1. **Sensible defaults** - Works out of the box
2. **Documentation** - Clear guides for customization
3. **Gradual adoption** - Can enable features incrementally

## References

- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Husky Git Hooks](https://typicode.github.io/husky/)
- [ESLint](https://eslint.org/)
- [ADR-026: Cross-Product Subscriptions](./ADR-026-cross-product-subscriptions.md)
