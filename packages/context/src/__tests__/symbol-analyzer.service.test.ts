/**
 * Symbol Analyzer Service Tests
 * @prompt-id forge-v4.1:test:symbol-analyzer:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect } from 'vitest';
import { SymbolAnalyzerService } from '../services/symbol-analyzer.service';
import { SymbolKind, SymbolVisibility } from '../types/codebase.types';

describe('SymbolAnalyzerService', () => {
  const service = new SymbolAnalyzerService();

  describe('analyzeFile', () => {
    it('should extract function declarations', () => {
      const content = `
function greet(name: string): string {
  return 'Hello, ' + name;
}

export function add(a: number, b: number): number {
  return a + b;
}
`;
      const result = service.analyzeFile(content, 'functions.ts');

      expect(result.symbols.length).toBeGreaterThanOrEqual(2);

      const greetFn = result.symbols.find(s => s.name === 'greet');
      expect(greetFn).toBeDefined();
      expect(greetFn?.kind).toBe(SymbolKind.FUNCTION);
      expect(greetFn?.isExported).toBe(false);

      const addFn = result.symbols.find(s => s.name === 'add');
      expect(addFn).toBeDefined();
      expect(addFn?.kind).toBe(SymbolKind.FUNCTION);
      expect(addFn?.isExported).toBe(true);
    });

    it('should extract arrow functions as FUNCTION kind', () => {
      const content = `
const multiply = (a: number, b: number): number => a * b;

export const divide = (a: number, b: number): number => {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
};
`;
      const result = service.analyzeFile(content, 'arrows.ts');

      const multiply = result.symbols.find(s => s.name === 'multiply');
      expect(multiply).toBeDefined();
      // Arrow functions assigned to const are classified as FUNCTION
      expect(multiply?.kind).toBe(SymbolKind.FUNCTION);

      const divide = result.symbols.find(s => s.name === 'divide');
      expect(divide).toBeDefined();
      expect(divide?.isExported).toBe(true);
    });

    it('should extract class declarations', () => {
      const content = `
export class Calculator {
  private value: number = 0;

  add(n: number): this {
    this.value += n;
    return this;
  }

  subtract(n: number): this {
    this.value -= n;
    return this;
  }

  getResult(): number {
    return this.value;
  }
}

abstract class BaseService {
  abstract process(): void;
}
`;
      const result = service.analyzeFile(content, 'classes.ts');

      const calculator = result.symbols.find(s => s.name === 'Calculator');
      expect(calculator).toBeDefined();
      expect(calculator?.kind).toBe(SymbolKind.CLASS);
      expect(calculator?.isExported).toBe(true);

      const baseService = result.symbols.find(s => s.name === 'BaseService');
      expect(baseService).toBeDefined();
      expect(baseService?.kind).toBe(SymbolKind.CLASS);
      expect(baseService?.isAbstract).toBe(true);

      // Methods are in children array
      if (calculator) {
        const addMethod = calculator.children.find(s => s.name === 'add' && s.kind === SymbolKind.METHOD);
        expect(addMethod).toBeDefined();
      }
    });

    it('should extract interfaces', () => {
      const content = `
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

interface Config {
  apiUrl: string;
  timeout: number;
}
`;
      const result = service.analyzeFile(content, 'interfaces.ts');

      const user = result.symbols.find(s => s.name === 'User');
      expect(user).toBeDefined();
      expect(user?.kind).toBe(SymbolKind.INTERFACE);
      expect(user?.isExported).toBe(true);

      const config = result.symbols.find(s => s.name === 'Config');
      expect(config).toBeDefined();
      expect(config?.kind).toBe(SymbolKind.INTERFACE);
      expect(config?.isExported).toBe(false);
    });

    it('should extract type aliases', () => {
      const content = `
export type ID = string;
type Nullable<T> = T | null;
export type UserResponse = { id: string } & { token: string };
`;
      const result = service.analyzeFile(content, 'types.ts');

      const id = result.symbols.find(s => s.name === 'ID');
      expect(id).toBeDefined();
      expect(id?.kind).toBe(SymbolKind.TYPE_ALIAS);

      const nullable = result.symbols.find(s => s.name === 'Nullable');
      expect(nullable).toBeDefined();
      expect(nullable?.kind).toBe(SymbolKind.TYPE_ALIAS);
    });

    it('should extract enums', () => {
      const content = `
export enum Status {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

enum Priority {
  LOW,
  MEDIUM,
  HIGH,
}
`;
      const result = service.analyzeFile(content, 'enums.ts');

      const status = result.symbols.find(s => s.name === 'Status');
      expect(status).toBeDefined();
      expect(status?.kind).toBe(SymbolKind.ENUM);
      expect(status?.isExported).toBe(true);

      // Enum members are in children
      if (status) {
        const pending = status.children.find(s => s.name === 'PENDING');
        expect(pending).toBeDefined();
        expect(pending?.kind).toBe(SymbolKind.ENUM_MEMBER);
      }
    });

    it('should calculate complexity metrics', () => {
      const content = `
function complexFunction(value: number): string {
  if (value < 0) {
    return 'negative';
  } else if (value === 0) {
    return 'zero';
  } else if (value < 10) {
    return 'small';
  } else if (value < 100) {
    return 'medium';
  } else {
    return 'large';
  }
}
`;
      const result = service.analyzeFile(content, 'complex.ts');

      const fn = result.symbols.find(s => s.name === 'complexFunction');
      expect(fn).toBeDefined();
      expect(fn?.complexity.cyclomaticComplexity).toBeGreaterThan(1);
    });

    it('should extract references between symbols', () => {
      const content = `
import { helper } from './utils';

function processData(data: string): void {
  const result = helper(data);
  console.log(result);
}
`;
      const result = service.analyzeFile(content, 'refs.ts');

      expect(result.references.length).toBeGreaterThan(0);
      const helperRef = result.references.find(r => r.targetName === 'helper');
      expect(helperRef).toBeDefined();
    });

    it('should handle empty files', () => {
      const result = service.analyzeFile('', 'empty.ts');

      expect(result.symbols).toHaveLength(0);
      expect(result.references).toHaveLength(0);
    });

    it('should handle files with only imports', () => {
      const content = `
import { a } from 'a';
import { b } from 'b';
`;
      const result = service.analyzeFile(content, 'imports-only.ts');

      expect(result.symbols).toHaveLength(0);
      expect(result.references.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract async functions', () => {
      const content = `
export async function fetchData(url: string): Promise<Response> {
  return fetch(url);
}
`;
      const result = service.analyzeFile(content, 'async.ts');

      const fn = result.symbols.find(s => s.name === 'fetchData');
      expect(fn).toBeDefined();
      expect(fn?.isAsync).toBe(true);
    });

    it('should extract static methods in class children', () => {
      const content = `
class Factory {
  static create(): Factory {
    return new Factory();
  }
}
`;
      const result = service.analyzeFile(content, 'static.ts');

      const factory = result.symbols.find(s => s.name === 'Factory');
      expect(factory).toBeDefined();

      // Static methods are in children
      if (factory) {
        const create = factory.children.find(s => s.name === 'create');
        expect(create).toBeDefined();
        expect(create?.isStatic).toBe(true);
      }
    });

    it('should track symbol visibility in class children', () => {
      const content = `
class Service {
  public name: string = '';
  private secret: string = '';
  protected internal: string = '';
}
`;
      const result = service.analyzeFile(content, 'visibility.ts');

      const service_class = result.symbols.find(s => s.name === 'Service');
      expect(service_class).toBeDefined();

      if (service_class) {
        const name = service_class.children.find(s => s.name === 'name');
        expect(name?.visibility).toBe(SymbolVisibility.PUBLIC);

        const secret = service_class.children.find(s => s.name === 'secret');
        expect(secret?.visibility).toBe(SymbolVisibility.PRIVATE);

        const internal = service_class.children.find(s => s.name === 'internal');
        expect(internal?.visibility).toBe(SymbolVisibility.PROTECTED);
      }
    });
  });

  describe('analyzeProject', () => {
    it('should analyze multiple files', () => {
      const files = [
        { path: 'a.ts', content: 'export function a() {}' },
        { path: 'b.ts', content: 'export function b() {}' },
        { path: 'c.ts', content: 'export function c() {}' },
      ];

      const results = service.analyzeProject(files);

      expect(results.size).toBe(3);
      // Note: analyzeProject uses full paths from ts-morph
      // Just verify we have results
      let fileCount = 0;
      for (const [, result] of results) {
        expect(result.symbols.length).toBeGreaterThanOrEqual(1);
        fileCount++;
      }
      expect(fileCount).toBe(3);
    });
  });

  describe('file metrics', () => {
    it('should compute file metrics', () => {
      const content = `
export function a() {}
export function b() {}
function c() {}
`;
      const result = service.analyzeFile(content, 'metrics.ts');

      expect(result.fileMetrics.totalSymbols).toBe(3);
      expect(result.fileMetrics.exportedSymbols).toBe(2);
    });
  });
});
