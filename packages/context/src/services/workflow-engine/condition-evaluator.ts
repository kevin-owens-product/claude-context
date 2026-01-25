/**
 * ConditionEvaluator - Expression and condition evaluation
 *
 * Features:
 * - Simple field comparisons
 * - Compound AND/OR logic
 * - Expression evaluation (safe subset)
 * - Date/time comparisons
 * - Collection operations
 *
 * @prompt-id forge-v4.1:service:condition-evaluator:001
 */

import type {
  ConditionExpression,
  ConditionOperator,
  ExecutionContext,
} from './types';

export class ConditionEvaluator {
  /**
   * Evaluate a condition expression
   */
  async evaluate(
    condition: ConditionExpression,
    context: ExecutionContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'SIMPLE':
        return this.evaluateSimple(condition, context);
      case 'COMPOUND':
        return this.evaluateCompound(condition, context);
      case 'EXPRESSION':
        return this.evaluateExpression(condition.expression!, context);
      default:
        throw new Error(`Unknown condition type: ${condition.type}`);
    }
  }

  /**
   * Evaluate a simple field comparison
   */
  private evaluateSimple(
    condition: ConditionExpression,
    context: ExecutionContext
  ): boolean {
    const { field, operator, value } = condition;
    if (!field || !operator) {
      throw new Error('Simple condition requires field and operator');
    }

    const actualValue = this.resolveField(field, context);
    return this.compare(actualValue, operator, value);
  }

  /**
   * Evaluate compound AND/OR/NOT conditions
   */
  private async evaluateCompound(
    condition: ConditionExpression,
    context: ExecutionContext
  ): Promise<boolean> {
    const { logic, conditions } = condition;
    if (!logic || !conditions) {
      throw new Error('Compound condition requires logic and conditions');
    }

    switch (logic) {
      case 'AND':
        for (const c of conditions) {
          if (!(await this.evaluate(c, context))) {
            return false;
          }
        }
        return true;

      case 'OR':
        for (const c of conditions) {
          if (await this.evaluate(c, context)) {
            return true;
          }
        }
        return false;

      case 'NOT':
        if (conditions.length !== 1) {
          throw new Error('NOT requires exactly one condition');
        }
        return !(await this.evaluate(conditions[0], context));

      default:
        throw new Error(`Unknown logic operator: ${logic}`);
    }
  }

  /**
   * Evaluate a JavaScript-like expression (safe subset)
   */
  private evaluateExpression(
    expression: string,
    context: ExecutionContext
  ): boolean {
    // Parse and evaluate a safe subset of expressions
    // Format: field1 == value1 && field2 > value2
    // Supports: ==, !=, >, >=, <, <=, &&, ||, !, in, contains

    const tokens = this.tokenize(expression);
    return this.parseExpression(tokens, context);
  }

  /**
   * Compare values using an operator
   */
  private compare(
    actual: unknown,
    operator: ConditionOperator,
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'eq':
        return this.deepEqual(actual, expected);

      case 'ne':
        return !this.deepEqual(actual, expected);

      case 'gt':
        return this.toNumber(actual) > this.toNumber(expected);

      case 'gte':
        return this.toNumber(actual) >= this.toNumber(expected);

      case 'lt':
        return this.toNumber(actual) < this.toNumber(expected);

      case 'lte':
        return this.toNumber(actual) <= this.toNumber(expected);

      case 'in':
        return Array.isArray(expected) && expected.includes(actual);

      case 'nin':
        return Array.isArray(expected) && !expected.includes(actual);

      case 'contains':
        if (typeof actual === 'string') {
          return actual.includes(String(expected));
        }
        if (Array.isArray(actual)) {
          return actual.includes(expected);
        }
        return false;

      case 'startsWith':
        return typeof actual === 'string' && actual.startsWith(String(expected));

      case 'endsWith':
        return typeof actual === 'string' && actual.endsWith(String(expected));

      case 'matches':
        return typeof actual === 'string' && new RegExp(String(expected)).test(actual);

      case 'isNull':
        return actual === null || actual === undefined;

      case 'isNotNull':
        return actual !== null && actual !== undefined;

      case 'isEmpty':
        if (actual === null || actual === undefined) return true;
        if (typeof actual === 'string') return actual.length === 0;
        if (Array.isArray(actual)) return actual.length === 0;
        if (typeof actual === 'object') return Object.keys(actual).length === 0;
        return false;

      case 'isNotEmpty':
        if (actual === null || actual === undefined) return false;
        if (typeof actual === 'string') return actual.length > 0;
        if (Array.isArray(actual)) return actual.length > 0;
        if (typeof actual === 'object') return Object.keys(actual).length > 0;
        return true;

      case 'between':
        if (!Array.isArray(expected) || expected.length !== 2) {
          throw new Error('between operator requires [min, max] array');
        }
        const num = this.toNumber(actual);
        return num >= this.toNumber(expected[0]) && num <= this.toNumber(expected[1]);

      case 'olderThan':
        return this.isOlderThan(actual, expected);

      case 'newerThan':
        return this.isNewerThan(actual, expected);

      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  /**
   * Resolve a field path from context
   */
  private resolveField(field: string, context: ExecutionContext): unknown {
    const parts = field.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array indexing: items[0]
      const match = part.match(/^(\w+)\[(\d+)\]$/);
      if (match) {
        current = (current as Record<string, unknown>)[match[1]];
        if (Array.isArray(current)) {
          current = current[parseInt(match[2], 10)];
        } else {
          return undefined;
        }
      } else {
        current = (current as Record<string, unknown>)[part];
      }
    }

    return current;
  }

  /**
   * Tokenize an expression string
   */
  private tokenize(expression: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];

      if (inString) {
        current += char;
        if (char === stringChar) {
          tokens.push(current);
          current = '';
          inString = false;
        }
      } else if (char === '"' || char === "'") {
        if (current) tokens.push(current);
        current = char;
        inString = true;
        stringChar = char;
      } else if (char === ' ' || char === '\t') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else if ('()!'.includes(char)) {
        if (current) tokens.push(current);
        tokens.push(char);
        current = '';
      } else if (i < expression.length - 1) {
        const twoChar = char + expression[i + 1];
        if (['==', '!=', '>=', '<=', '&&', '||'].includes(twoChar)) {
          if (current) tokens.push(current);
          tokens.push(twoChar);
          current = '';
          i++;
          continue;
        }
        current += char;
      } else {
        current += char;
      }
    }

    if (current) tokens.push(current);
    return tokens;
  }

  /**
   * Parse and evaluate tokenized expression
   */
  private parseExpression(tokens: string[], context: ExecutionContext): boolean {
    // Simple recursive descent parser for: expr = term ((&&|||) term)*
    let index = 0;

    const parsePrimary = (): boolean => {
      if (tokens[index] === '!') {
        index++;
        return !parsePrimary();
      }

      if (tokens[index] === '(') {
        index++;
        const result = parseOr();
        if (tokens[index] === ')') index++;
        return result;
      }

      // Simple comparison: field op value
      const field = tokens[index++];
      const op = tokens[index++];
      const valueToken = tokens[index++];

      // Parse value
      let value: unknown;
      if (valueToken.startsWith('"') || valueToken.startsWith("'")) {
        value = valueToken.slice(1, -1);
      } else if (valueToken === 'true') {
        value = true;
      } else if (valueToken === 'false') {
        value = false;
      } else if (valueToken === 'null') {
        value = null;
      } else if (!isNaN(Number(valueToken))) {
        value = Number(valueToken);
      } else {
        value = valueToken;
      }

      const actualValue = this.resolveField(field, context);
      const operator = this.mapOperator(op);
      return this.compare(actualValue, operator, value);
    };

    const parseAnd = (): boolean => {
      let result = parsePrimary();
      while (tokens[index] === '&&') {
        index++;
        result = result && parsePrimary();
      }
      return result;
    };

    const parseOr = (): boolean => {
      let result = parseAnd();
      while (tokens[index] === '||') {
        index++;
        result = result || parseAnd();
      }
      return result;
    };

    return parseOr();
  }

  /**
   * Map expression operator to ConditionOperator
   */
  private mapOperator(op: string): ConditionOperator {
    const mapping: Record<string, ConditionOperator> = {
      '==': 'eq',
      '!=': 'ne',
      '>': 'gt',
      '>=': 'gte',
      '<': 'lt',
      '<=': 'lte',
      'in': 'in',
      'contains': 'contains',
      'startsWith': 'startsWith',
      'endsWith': 'endsWith',
      'matches': 'matches',
    };
    return mapping[op] || 'eq';
  }

  /**
   * Deep equality comparison
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;

    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, i) => this.deepEqual(val, b[i]));
    }

    if (typeof a === 'object' && a !== null && b !== null) {
      const aKeys = Object.keys(a as Record<string, unknown>);
      const bKeys = Object.keys(b as Record<string, unknown>);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every(key =>
        this.deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      );
    }

    return false;
  }

  /**
   * Convert value to number
   */
  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return parseFloat(value) || 0;
    if (value instanceof Date) return value.getTime();
    return 0;
  }

  /**
   * Check if date is older than duration
   */
  private isOlderThan(actual: unknown, duration: unknown): boolean {
    const date = this.toDate(actual);
    if (!date) return false;

    const durationMs = this.parseDuration(String(duration));
    const threshold = new Date(Date.now() - durationMs);

    return date < threshold;
  }

  /**
   * Check if date is newer than duration
   */
  private isNewerThan(actual: unknown, duration: unknown): boolean {
    const date = this.toDate(actual);
    if (!date) return false;

    const durationMs = this.parseDuration(String(duration));
    const threshold = new Date(Date.now() - durationMs);

    return date > threshold;
  }

  /**
   * Convert value to Date
   */
  private toDate(value: unknown): Date | null {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'number') return new Date(value);
    return null;
  }

  /**
   * Parse duration string (e.g., "3d", "2h", "30m")
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhdwMy])$/);
    if (!match) return 0;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      's': 1000,           // seconds
      'm': 60000,          // minutes
      'h': 3600000,        // hours
      'd': 86400000,       // days
      'w': 604800000,      // weeks
      'M': 2592000000,     // months (30 days)
      'y': 31536000000,    // years
    };

    return value * (multipliers[unit] || 0);
  }
}
