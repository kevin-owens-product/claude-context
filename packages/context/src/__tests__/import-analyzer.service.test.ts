/**
 * Import Analyzer Service Tests
 * @prompt-id forge-v4.1:test:import-analyzer:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import { describe, it, expect } from 'vitest';
import { ImportAnalyzerService } from '../services/import-analyzer.service';

describe('ImportAnalyzerService', () => {
  const service = new ImportAnalyzerService();

  describe('analyzeFile', () => {
    it('should extract ES6 imports', () => {
      const content = `
import { foo, bar } from './module';
import React from 'react';
import * as utils from '../utils';
`;
      const result = service.analyzeFile(content, 'test.ts');

      expect(result.imports.length).toBeGreaterThanOrEqual(3);

      // Check module import
      const moduleImport = result.imports.find(i => i.importPath === './module');
      expect(moduleImport).toBeDefined();
      expect(moduleImport?.importType).toBe('ES_IMPORT');
      expect(moduleImport?.importedSymbols).toContain('foo');
      expect(moduleImport?.importedSymbols).toContain('bar');

      // Check react import (default import)
      const reactImport = result.imports.find(i => i.importPath === 'react');
      expect(reactImport).toBeDefined();
      expect(reactImport?.importType).toBe('ES_IMPORT');

      // Check namespace import
      const utilsImport = result.imports.find(i => i.importPath === '../utils');
      expect(utilsImport).toBeDefined();
      expect(utilsImport?.importType).toBe('ES_IMPORT');
    });

    it('should extract default imports', () => {
      const content = `
import MyComponent from './MyComponent';
import _, { map } from 'lodash';
`;
      const result = service.analyzeFile(content, 'test.ts');

      expect(result.imports.length).toBeGreaterThanOrEqual(2);

      const myComponentImport = result.imports.find(i => i.importPath === './MyComponent');
      expect(myComponentImport).toBeDefined();
      expect(myComponentImport?.importedSymbols).toContain('default');

      const lodashImport = result.imports.find(i => i.importPath === 'lodash');
      expect(lodashImport).toBeDefined();
    });

    it('should extract dynamic imports', () => {
      const content = `
const module = await import('./dynamic-module');
import('./lazy').then(m => m.default);
`;
      const result = service.analyzeFile(content, 'test.ts');

      expect(result.imports.some(i =>
        i.importPath === './dynamic-module' && i.importType === 'ES_DYNAMIC'
      )).toBe(true);
      expect(result.imports.some(i =>
        i.importPath === './lazy' && i.importType === 'ES_DYNAMIC'
      )).toBe(true);
    });

    it('should extract CommonJS requires', () => {
      const content = `
const fs = require('fs');
const { join } = require('path');
const config = require('./config.json');
`;
      const result = service.analyzeFile(content, 'test.js');

      expect(result.imports.some(i =>
        i.importPath === 'fs' && i.importType === 'COMMONJS'
      )).toBe(true);
      expect(result.imports.some(i =>
        i.importPath === 'path' && i.importType === 'COMMONJS'
      )).toBe(true);
    });

    it('should extract type-only imports', () => {
      const content = `
import type { SomeType } from './types';
`;
      const result = service.analyzeFile(content, 'test.ts');

      expect(result.imports.some(i =>
        i.importPath === './types' && i.isTypeOnly === true
      )).toBe(true);
    });

    it('should extract re-exports', () => {
      const content = `
export { foo, bar } from './module';
export * from './all-exports';
export { default as Component } from './Component';
`;
      const result = service.analyzeFile(content, 'index.ts');

      expect(result.reexports.length).toBeGreaterThanOrEqual(2);
      expect(result.reexports.some(r => r.importPath === './module')).toBe(true);
      expect(result.reexports.some(r => r.importPath === './all-exports')).toBe(true);
    });

    it('should handle empty files', () => {
      const result = service.analyzeFile('', 'empty.ts');

      expect(result.imports).toHaveLength(0);
      expect(result.reexports).toHaveLength(0);
    });

    it('should handle files with only comments', () => {
      const content = `
// This is a comment
/* Multi-line
   comment */
`;
      const result = service.analyzeFile(content, 'comments.ts');

      expect(result.imports).toHaveLength(0);
    });

    it('should extract CSS imports', () => {
      const content = `
@import './reset.css';
@import url('https://fonts.googleapis.com/css2?family=Roboto');
`;
      const result = service.analyzeFile(content, 'styles.css');

      expect(result.imports.some(i => i.importType === 'CSS_IMPORT')).toBe(true);
    });

    it('should handle mixed import styles', () => {
      const content = `
import { Component } from 'react';
const lodash = require('lodash');
import('./lazy-module');
export { helper } from './utils';
`;
      const result = service.analyzeFile(content, 'mixed.ts');

      // Should have ES import, CommonJS require, dynamic import
      expect(result.imports.length).toBeGreaterThanOrEqual(3);
      expect(result.reexports.length).toBeGreaterThanOrEqual(1);
    });

    it('should correctly identify external vs relative imports', () => {
      const content = `
import { useState } from 'react';
import { helper } from './utils';
import { config } from '../config';
import { types } from '@org/package';
`;
      const result = service.analyzeFile(content, 'test.ts');

      // Relative: ./utils, ../config
      // External: react, @org/package
      const relativeImports = result.imports.filter(i =>
        i.importPath.startsWith('.') || i.importPath.startsWith('..')
      );
      const externalImports = result.imports.filter(i =>
        !i.importPath.startsWith('.') && !i.importPath.startsWith('..')
      );

      expect(relativeImports).toHaveLength(2);
      expect(externalImports).toHaveLength(2);
    });
  });

  describe('detectLanguage', () => {
    it('should detect TypeScript files', () => {
      expect(service.detectLanguage('test.ts')).toBe('typescript');
      expect(service.detectLanguage('test.tsx')).toBe('typescript');
    });

    it('should detect JavaScript files', () => {
      expect(service.detectLanguage('test.js')).toBe('javascript');
      expect(service.detectLanguage('test.jsx')).toBe('javascript');
      expect(service.detectLanguage('test.mjs')).toBe('javascript');
      expect(service.detectLanguage('test.cjs')).toBe('javascript');
    });

    it('should detect CSS files', () => {
      // CSS parser returns 'css' for all CSS-related extensions
      expect(service.detectLanguage('styles.css')).toBe('css');
      expect(service.detectLanguage('styles.scss')).toBe('css');
      expect(service.detectLanguage('styles.less')).toBe('css');
    });

    it('should return null for unknown extensions', () => {
      expect(service.detectLanguage('file.xyz')).toBeNull();
      expect(service.detectLanguage('README.md')).toBeNull();
    });
  });

  describe('isExternalImport', () => {
    it('should identify relative imports as non-external', () => {
      expect(service.isExternalImport('./module')).toBe(false);
      expect(service.isExternalImport('../utils')).toBe(false);
      expect(service.isExternalImport('/absolute/path')).toBe(false);
    });

    it('should identify npm packages as external', () => {
      expect(service.isExternalImport('react')).toBe(true);
      expect(service.isExternalImport('lodash/map')).toBe(true);
      expect(service.isExternalImport('@org/package')).toBe(true);
    });

    it('should handle alias imports', () => {
      expect(service.isExternalImport('@/components')).toBe(false);
      expect(service.isExternalImport('~/utils')).toBe(false);
      expect(service.isExternalImport('src/helpers')).toBe(false);
    });
  });

  describe('extractPackageName', () => {
    it('should extract package name from path', () => {
      expect(service.extractPackageName('lodash')).toBe('lodash');
      expect(service.extractPackageName('lodash/map')).toBe('lodash');
      expect(service.extractPackageName('lodash/fp/map')).toBe('lodash');
    });

    it('should handle scoped packages', () => {
      expect(service.extractPackageName('@org/package')).toBe('@org/package');
      expect(service.extractPackageName('@org/package/path')).toBe('@org/package');
    });
  });
});
