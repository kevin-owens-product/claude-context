/**
 * Symbol Analyzer Service - Extract symbols from TypeScript/JavaScript using AST
 * @prompt-id forge-v4.1:service:symbol-analyzer:001
 * @generated-at 2026-01-25T00:00:00Z
 * @model claude-opus-4-5
 */

import {
  Project,
  SourceFile,
  Node,
  SyntaxKind,
  FunctionDeclaration,
  MethodDeclaration,
  ClassDeclaration,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  EnumDeclaration,
  VariableDeclaration,
  VariableDeclarationKind,
  PropertyDeclaration,
  GetAccessorDeclaration,
  SetAccessorDeclaration,
  ConstructorDeclaration,
  ParameterDeclaration,
  ts,
} from 'ts-morph';
import {
  SymbolKind,
  SymbolVisibility,
  ReferenceType,
} from '../types/codebase.types';
import type {
  CodeSymbolId,
  CodeFileId,
  RepositoryId,
  SymbolParameter,
  SymbolComplexityMetrics,
} from '../types/codebase.types';

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedSymbol {
  name: string;
  kind: SymbolKind;
  signature?: string;
  documentation?: string;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  containerName?: string;
  visibility: SymbolVisibility;
  isExported: boolean;
  isAsync: boolean;
  isStatic: boolean;
  isAbstract: boolean;
  returnType?: string;
  parameters: SymbolParameter[];
  typeParameters: string[];
  complexity: SymbolComplexityMetrics;
  children: ExtractedSymbol[];
}

export interface ExtractedReference {
  targetName: string;
  referenceType: ReferenceType;
  line: number;
  column: number;
  isTypeOnly: boolean;
  isExternal: boolean;
  externalPackage?: string;
}

export interface SymbolAnalysisResult {
  symbols: ExtractedSymbol[];
  references: ExtractedReference[];
  fileMetrics: {
    totalSymbols: number;
    exportedSymbols: number;
    avgComplexity: number;
    maxComplexity: number;
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export class SymbolAnalyzerService {
  private project: Project;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        lib: ['ES2022'],
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        allowJs: true,
        checkJs: false,
      },
    });
  }

  /**
   * Analyze a file and extract all symbols
   */
  analyzeFile(content: string, filePath: string): SymbolAnalysisResult {
    // Create or update source file
    let sourceFile = this.project.getSourceFile(filePath);
    if (sourceFile) {
      sourceFile.replaceWithText(content);
    } else {
      sourceFile = this.project.createSourceFile(filePath, content);
    }

    const symbols: ExtractedSymbol[] = [];
    const references: ExtractedReference[] = [];

    // Extract top-level symbols
    this.extractSymbols(sourceFile, symbols);

    // Extract references
    this.extractReferences(sourceFile, references);

    // Compute file metrics
    const allSymbols = this.flattenSymbols(symbols);
    const complexities = allSymbols.map((s) => s.complexity.cyclomaticComplexity);
    const avgComplexity =
      complexities.length > 0
        ? complexities.reduce((a, b) => a + b, 0) / complexities.length
        : 0;
    const maxComplexity = complexities.length > 0 ? Math.max(...complexities) : 0;

    // Clean up
    this.project.removeSourceFile(sourceFile);

    return {
      symbols,
      references,
      fileMetrics: {
        totalSymbols: allSymbols.length,
        exportedSymbols: allSymbols.filter((s) => s.isExported).length,
        avgComplexity,
        maxComplexity,
      },
    };
  }

  /**
   * Analyze multiple files in a project context
   */
  analyzeProject(
    files: Array<{ path: string; content: string }>
  ): Map<string, SymbolAnalysisResult> {
    const results = new Map<string, SymbolAnalysisResult>();

    // Add all files to the project
    for (const file of files) {
      this.project.createSourceFile(file.path, file.content, { overwrite: true });
    }

    // Analyze each file
    for (const sourceFile of this.project.getSourceFiles()) {
      const filePath = sourceFile.getFilePath();
      const symbols: ExtractedSymbol[] = [];
      const references: ExtractedReference[] = [];

      this.extractSymbols(sourceFile, symbols);
      this.extractReferences(sourceFile, references);

      const allSymbols = this.flattenSymbols(symbols);
      const complexities = allSymbols.map((s) => s.complexity.cyclomaticComplexity);

      results.set(filePath, {
        symbols,
        references,
        fileMetrics: {
          totalSymbols: allSymbols.length,
          exportedSymbols: allSymbols.filter((s) => s.isExported).length,
          avgComplexity:
            complexities.length > 0
              ? complexities.reduce((a, b) => a + b, 0) / complexities.length
              : 0,
          maxComplexity: complexities.length > 0 ? Math.max(...complexities) : 0,
        },
      });
    }

    // Clean up
    for (const sourceFile of this.project.getSourceFiles()) {
      this.project.removeSourceFile(sourceFile);
    }

    return results;
  }

  // ============================================================================
  // SYMBOL EXTRACTION
  // ============================================================================

  private extractSymbols(sourceFile: SourceFile, symbols: ExtractedSymbol[]): void {
    // Functions
    for (const func of sourceFile.getFunctions()) {
      symbols.push(this.extractFunction(func));
    }

    // Classes
    for (const cls of sourceFile.getClasses()) {
      symbols.push(this.extractClass(cls));
    }

    // Interfaces
    for (const iface of sourceFile.getInterfaces()) {
      symbols.push(this.extractInterface(iface));
    }

    // Type aliases
    for (const type of sourceFile.getTypeAliases()) {
      symbols.push(this.extractTypeAlias(type));
    }

    // Enums
    for (const enumDecl of sourceFile.getEnums()) {
      symbols.push(this.extractEnum(enumDecl));
    }

    // Variables
    for (const varStmt of sourceFile.getVariableStatements()) {
      for (const varDecl of varStmt.getDeclarations()) {
        symbols.push(this.extractVariable(varDecl, varStmt.isExported()));
      }
    }
  }

  private extractFunction(func: FunctionDeclaration): ExtractedSymbol {
    const name = func.getName() || 'anonymous';
    const start = func.getStartLineNumber();
    const end = func.getEndLineNumber();

    return {
      name,
      kind: SymbolKind.FUNCTION,
      signature: this.getFunctionSignature(func),
      documentation: this.getJsDoc(func),
      startLine: start,
      startColumn: func.getStart() - func.getStartLinePos(),
      endLine: end,
      endColumn: func.getEnd() - func.getEndLineNumber(),
      visibility: SymbolVisibility.PUBLIC,
      isExported: func.isExported(),
      isAsync: func.isAsync(),
      isStatic: false,
      isAbstract: false,
      returnType: func.getReturnType().getText(),
      parameters: this.extractParameters(func.getParameters()),
      typeParameters: func.getTypeParameters().map((tp) => tp.getName()),
      complexity: this.calculateComplexity(func),
      children: [],
    };
  }

  private extractClass(cls: ClassDeclaration): ExtractedSymbol {
    const name = cls.getName() || 'AnonymousClass';
    const children: ExtractedSymbol[] = [];

    // Constructor
    const ctor = cls.getConstructors()[0];
    if (ctor) {
      children.push(this.extractConstructor(ctor, name));
    }

    // Methods
    for (const method of cls.getMethods()) {
      children.push(this.extractMethod(method, name));
    }

    // Properties
    for (const prop of cls.getProperties()) {
      children.push(this.extractProperty(prop, name));
    }

    // Getters
    for (const getter of cls.getGetAccessors()) {
      children.push(this.extractGetter(getter, name));
    }

    // Setters
    for (const setter of cls.getSetAccessors()) {
      children.push(this.extractSetter(setter, name));
    }

    return {
      name,
      kind: SymbolKind.CLASS,
      signature: this.getClassSignature(cls),
      documentation: this.getJsDoc(cls),
      startLine: cls.getStartLineNumber(),
      startColumn: cls.getStart() - cls.getStartLinePos(),
      endLine: cls.getEndLineNumber(),
      endColumn: 0,
      visibility: SymbolVisibility.PUBLIC,
      isExported: cls.isExported(),
      isAsync: false,
      isStatic: false,
      isAbstract: cls.isAbstract(),
      typeParameters: cls.getTypeParameters().map((tp) => tp.getName()),
      parameters: [],
      complexity: this.aggregateChildComplexity(children),
      children,
    };
  }

  private extractMethod(method: MethodDeclaration, containerName: string): ExtractedSymbol {
    return {
      name: method.getName(),
      kind: SymbolKind.METHOD,
      signature: this.getMethodSignature(method),
      documentation: this.getJsDoc(method),
      startLine: method.getStartLineNumber(),
      startColumn: method.getStart() - method.getStartLinePos(),
      endLine: method.getEndLineNumber(),
      endColumn: 0,
      containerName,
      visibility: this.getVisibility(method),
      isExported: false,
      isAsync: method.isAsync(),
      isStatic: method.isStatic(),
      isAbstract: method.isAbstract(),
      returnType: method.getReturnType().getText(),
      parameters: this.extractParameters(method.getParameters()),
      typeParameters: method.getTypeParameters().map((tp) => tp.getName()),
      complexity: this.calculateComplexity(method),
      children: [],
    };
  }

  private extractConstructor(
    ctor: ConstructorDeclaration,
    containerName: string
  ): ExtractedSymbol {
    return {
      name: 'constructor',
      kind: SymbolKind.CONSTRUCTOR,
      signature: `constructor(${ctor.getParameters().map((p) => p.getText()).join(', ')})`,
      documentation: this.getJsDoc(ctor),
      startLine: ctor.getStartLineNumber(),
      startColumn: ctor.getStart() - ctor.getStartLinePos(),
      endLine: ctor.getEndLineNumber(),
      endColumn: 0,
      containerName,
      visibility: SymbolVisibility.PUBLIC,
      isExported: false,
      isAsync: false,
      isStatic: false,
      isAbstract: false,
      parameters: this.extractParameters(ctor.getParameters()),
      typeParameters: [],
      complexity: this.calculateComplexity(ctor),
      children: [],
    };
  }

  private extractProperty(prop: PropertyDeclaration, containerName: string): ExtractedSymbol {
    return {
      name: prop.getName(),
      kind: SymbolKind.PROPERTY,
      signature: prop.getText(),
      startLine: prop.getStartLineNumber(),
      startColumn: prop.getStart() - prop.getStartLinePos(),
      endLine: prop.getEndLineNumber(),
      endColumn: 0,
      containerName,
      visibility: this.getVisibility(prop),
      isExported: false,
      isAsync: false,
      isStatic: prop.isStatic(),
      isAbstract: prop.isAbstract(),
      returnType: prop.getType().getText(),
      parameters: [],
      typeParameters: [],
      complexity: { cyclomaticComplexity: 1, cognitiveComplexity: 0, linesOfCode: 1, logicalLinesOfCode: 1, parameterCount: 0, nestingDepth: 0, maintainabilityIndex: 100 },
      children: [],
    };
  }

  private extractGetter(getter: GetAccessorDeclaration, containerName: string): ExtractedSymbol {
    return {
      name: getter.getName(),
      kind: SymbolKind.GETTER,
      signature: `get ${getter.getName()}(): ${getter.getReturnType().getText()}`,
      startLine: getter.getStartLineNumber(),
      startColumn: getter.getStart() - getter.getStartLinePos(),
      endLine: getter.getEndLineNumber(),
      endColumn: 0,
      containerName,
      visibility: this.getVisibility(getter),
      isExported: false,
      isAsync: false,
      isStatic: getter.isStatic(),
      isAbstract: getter.isAbstract(),
      returnType: getter.getReturnType().getText(),
      parameters: [],
      typeParameters: [],
      complexity: this.calculateComplexity(getter),
      children: [],
    };
  }

  private extractSetter(setter: SetAccessorDeclaration, containerName: string): ExtractedSymbol {
    return {
      name: setter.getName(),
      kind: SymbolKind.SETTER,
      signature: `set ${setter.getName()}(${setter.getParameters().map((p) => p.getText()).join(', ')})`,
      startLine: setter.getStartLineNumber(),
      startColumn: setter.getStart() - setter.getStartLinePos(),
      endLine: setter.getEndLineNumber(),
      endColumn: 0,
      containerName,
      visibility: this.getVisibility(setter),
      isExported: false,
      isAsync: false,
      isStatic: setter.isStatic(),
      isAbstract: setter.isAbstract(),
      parameters: this.extractParameters(setter.getParameters()),
      typeParameters: [],
      complexity: this.calculateComplexity(setter),
      children: [],
    };
  }

  private extractInterface(iface: InterfaceDeclaration): ExtractedSymbol {
    const children: ExtractedSymbol[] = [];

    // Properties
    for (const prop of iface.getProperties()) {
      children.push({
        name: prop.getName(),
        kind: SymbolKind.PROPERTY,
        signature: prop.getText(),
        startLine: prop.getStartLineNumber(),
        startColumn: 0,
        endLine: prop.getEndLineNumber(),
        endColumn: 0,
        visibility: SymbolVisibility.PUBLIC,
        isExported: false,
        isAsync: false,
        isStatic: false,
        isAbstract: false,
        returnType: prop.getType().getText(),
        parameters: [],
        typeParameters: [],
        complexity: { cyclomaticComplexity: 1, cognitiveComplexity: 0, linesOfCode: 1, logicalLinesOfCode: 1, parameterCount: 0, nestingDepth: 0, maintainabilityIndex: 100 },
        children: [],
      });
    }

    // Methods
    for (const method of iface.getMethods()) {
      children.push({
        name: method.getName(),
        kind: SymbolKind.METHOD,
        signature: method.getText(),
        startLine: method.getStartLineNumber(),
        startColumn: 0,
        endLine: method.getEndLineNumber(),
        endColumn: 0,
        visibility: SymbolVisibility.PUBLIC,
        isExported: false,
        isAsync: false,
        isStatic: false,
        isAbstract: true,
        returnType: method.getReturnType().getText(),
        parameters: this.extractParameters(method.getParameters()),
        typeParameters: method.getTypeParameters().map((tp) => tp.getName()),
        complexity: { cyclomaticComplexity: 1, cognitiveComplexity: 0, linesOfCode: 1, logicalLinesOfCode: 1, parameterCount: method.getParameters().length, nestingDepth: 0, maintainabilityIndex: 100 },
        children: [],
      });
    }

    return {
      name: iface.getName(),
      kind: SymbolKind.INTERFACE,
      signature: this.getInterfaceSignature(iface),
      documentation: this.getJsDoc(iface),
      startLine: iface.getStartLineNumber(),
      startColumn: 0,
      endLine: iface.getEndLineNumber(),
      endColumn: 0,
      visibility: SymbolVisibility.PUBLIC,
      isExported: iface.isExported(),
      isAsync: false,
      isStatic: false,
      isAbstract: false,
      typeParameters: iface.getTypeParameters().map((tp) => tp.getName()),
      parameters: [],
      complexity: { cyclomaticComplexity: 1, cognitiveComplexity: 0, linesOfCode: iface.getEndLineNumber() - iface.getStartLineNumber() + 1, logicalLinesOfCode: children.length, parameterCount: 0, nestingDepth: 0, maintainabilityIndex: 100 },
      children,
    };
  }

  private extractTypeAlias(type: TypeAliasDeclaration): ExtractedSymbol {
    return {
      name: type.getName(),
      kind: SymbolKind.TYPE_ALIAS,
      signature: type.getText(),
      documentation: this.getJsDoc(type),
      startLine: type.getStartLineNumber(),
      startColumn: 0,
      endLine: type.getEndLineNumber(),
      endColumn: 0,
      visibility: SymbolVisibility.PUBLIC,
      isExported: type.isExported(),
      isAsync: false,
      isStatic: false,
      isAbstract: false,
      returnType: type.getType().getText(),
      typeParameters: type.getTypeParameters().map((tp) => tp.getName()),
      parameters: [],
      complexity: { cyclomaticComplexity: 1, cognitiveComplexity: 0, linesOfCode: 1, logicalLinesOfCode: 1, parameterCount: 0, nestingDepth: 0, maintainabilityIndex: 100 },
      children: [],
    };
  }

  private extractEnum(enumDecl: EnumDeclaration): ExtractedSymbol {
    const children: ExtractedSymbol[] = enumDecl.getMembers().map((member) => ({
      name: member.getName(),
      kind: SymbolKind.ENUM_MEMBER,
      signature: member.getText(),
      startLine: member.getStartLineNumber(),
      startColumn: 0,
      endLine: member.getEndLineNumber(),
      endColumn: 0,
      visibility: SymbolVisibility.PUBLIC,
      isExported: false,
      isAsync: false,
      isStatic: false,
      isAbstract: false,
      parameters: [],
      typeParameters: [],
      complexity: { cyclomaticComplexity: 1, cognitiveComplexity: 0, linesOfCode: 1, logicalLinesOfCode: 1, parameterCount: 0, nestingDepth: 0, maintainabilityIndex: 100 },
      children: [],
    }));

    return {
      name: enumDecl.getName(),
      kind: SymbolKind.ENUM,
      signature: `enum ${enumDecl.getName()}`,
      documentation: this.getJsDoc(enumDecl),
      startLine: enumDecl.getStartLineNumber(),
      startColumn: 0,
      endLine: enumDecl.getEndLineNumber(),
      endColumn: 0,
      visibility: SymbolVisibility.PUBLIC,
      isExported: enumDecl.isExported(),
      isAsync: false,
      isStatic: false,
      isAbstract: false,
      parameters: [],
      typeParameters: [],
      complexity: { cyclomaticComplexity: 1, cognitiveComplexity: 0, linesOfCode: enumDecl.getEndLineNumber() - enumDecl.getStartLineNumber() + 1, logicalLinesOfCode: children.length, parameterCount: 0, nestingDepth: 0, maintainabilityIndex: 100 },
      children,
    };
  }

  private extractVariable(varDecl: VariableDeclaration, isExported: boolean): ExtractedSymbol {
    const initializer = varDecl.getInitializer();
    const declKind = varDecl.getVariableStatement()?.getDeclarationKind();
    const isConst = declKind === VariableDeclarationKind.Const;

    // Check if it's an arrow function or function expression
    let kind: SymbolKind = isConst ? SymbolKind.CONSTANT : SymbolKind.VARIABLE;
    let complexity = { cyclomaticComplexity: 1, cognitiveComplexity: 0, linesOfCode: 1, logicalLinesOfCode: 1, parameterCount: 0, nestingDepth: 0, maintainabilityIndex: 100 };

    if (initializer) {
      if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
        kind = SymbolKind.FUNCTION;
        complexity = this.calculateComplexity(initializer);
      }
    }

    return {
      name: varDecl.getName(),
      kind,
      signature: varDecl.getText(),
      startLine: varDecl.getStartLineNumber(),
      startColumn: 0,
      endLine: varDecl.getEndLineNumber(),
      endColumn: 0,
      visibility: SymbolVisibility.PUBLIC,
      isExported,
      isAsync: initializer && Node.isArrowFunction(initializer) ? initializer.isAsync() : false,
      isStatic: false,
      isAbstract: false,
      returnType: varDecl.getType().getText(),
      parameters: [],
      typeParameters: [],
      complexity,
      children: [],
    };
  }

  // ============================================================================
  // REFERENCE EXTRACTION
  // ============================================================================

  private extractReferences(sourceFile: SourceFile, references: ExtractedReference[]): void {
    // Extract call expressions
    sourceFile.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        const ref = this.extractCallReference(expr, node.getStartLineNumber());
        if (ref) references.push(ref);
      } else if (Node.isNewExpression(node)) {
        const expr = node.getExpression();
        references.push({
          targetName: expr.getText(),
          referenceType: ReferenceType.INSTANTIATION,
          line: node.getStartLineNumber(),
          column: node.getStart() - node.getStartLinePos(),
          isTypeOnly: false,
          isExternal: false,
        });
      } else if (Node.isPropertyAccessExpression(node)) {
        // Skip if parent is a call expression (already handled)
        if (!Node.isCallExpression(node.getParent())) {
          references.push({
            targetName: node.getName(),
            referenceType: ReferenceType.PROPERTY_ACCESS,
            line: node.getStartLineNumber(),
            column: node.getStart() - node.getStartLinePos(),
            isTypeOnly: false,
            isExternal: false,
          });
        }
      }
    });

    // Extract import references
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      const isExternal = !moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/');
      const packageName = isExternal ? this.extractPackageName(moduleSpecifier) : undefined;

      // Named imports
      for (const named of importDecl.getNamedImports()) {
        references.push({
          targetName: named.getName(),
          referenceType: ReferenceType.IMPORT,
          line: importDecl.getStartLineNumber(),
          column: 0,
          isTypeOnly: importDecl.isTypeOnly(),
          isExternal,
          externalPackage: packageName,
        });
      }

      // Default import
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport) {
        references.push({
          targetName: defaultImport.getText(),
          referenceType: ReferenceType.IMPORT,
          line: importDecl.getStartLineNumber(),
          column: 0,
          isTypeOnly: importDecl.isTypeOnly(),
          isExternal,
          externalPackage: packageName,
        });
      }

      // Namespace import
      const namespaceImport = importDecl.getNamespaceImport();
      if (namespaceImport) {
        references.push({
          targetName: namespaceImport.getText(),
          referenceType: ReferenceType.IMPORT,
          line: importDecl.getStartLineNumber(),
          column: 0,
          isTypeOnly: importDecl.isTypeOnly(),
          isExternal,
          externalPackage: packageName,
        });
      }
    }
  }

  private extractCallReference(expr: Node, line: number): ExtractedReference | null {
    let targetName: string;

    if (Node.isIdentifier(expr)) {
      targetName = expr.getText();
    } else if (Node.isPropertyAccessExpression(expr)) {
      targetName = expr.getName();
    } else {
      return null;
    }

    return {
      targetName,
      referenceType: ReferenceType.CALL,
      line,
      column: expr.getStart() - expr.getStartLinePos(),
      isTypeOnly: false,
      isExternal: false,
    };
  }

  // ============================================================================
  // COMPLEXITY CALCULATION
  // ============================================================================

  private calculateComplexity(node: Node): SymbolComplexityMetrics {
    let cyclomaticComplexity = 1; // Start with 1 for the function itself
    let cognitiveComplexity = 0;
    let nestingDepth = 0;
    let maxNesting = 0;
    let logicalLines = 0;

    const countBranches = (n: Node, depth: number) => {
      nestingDepth = Math.max(nestingDepth, depth);
      maxNesting = Math.max(maxNesting, depth);

      n.forEachChild((child) => {
        // Count decision points for cyclomatic complexity
        switch (child.getKind()) {
          case SyntaxKind.IfStatement:
            cyclomaticComplexity++;
            cognitiveComplexity += 1 + depth; // Nesting penalty
            countBranches(child, depth + 1);
            break;
          case SyntaxKind.ConditionalExpression: // Ternary
            cyclomaticComplexity++;
            cognitiveComplexity += 1 + depth;
            countBranches(child, depth);
            break;
          case SyntaxKind.ForStatement:
          case SyntaxKind.ForInStatement:
          case SyntaxKind.ForOfStatement:
          case SyntaxKind.WhileStatement:
          case SyntaxKind.DoStatement:
            cyclomaticComplexity++;
            cognitiveComplexity += 1 + depth;
            countBranches(child, depth + 1);
            break;
          case SyntaxKind.SwitchStatement:
            // Each case adds complexity
            const switchStmt = child as any;
            const caseCount = switchStmt.getClauses?.()?.length || 0;
            cyclomaticComplexity += caseCount;
            cognitiveComplexity += 1 + depth;
            countBranches(child, depth + 1);
            break;
          case SyntaxKind.CatchClause:
            cyclomaticComplexity++;
            cognitiveComplexity += 1 + depth;
            countBranches(child, depth + 1);
            break;
          case SyntaxKind.BinaryExpression:
            // Check for && or ||
            const binaryExpr = child as any;
            const operator = binaryExpr.getOperatorToken?.()?.getKind?.();
            if (
              operator === SyntaxKind.AmpersandAmpersandToken ||
              operator === SyntaxKind.BarBarToken ||
              operator === SyntaxKind.QuestionQuestionToken
            ) {
              cyclomaticComplexity++;
              cognitiveComplexity++;
            }
            countBranches(child, depth);
            break;
          default:
            countBranches(child, depth);
        }
      });
    };

    countBranches(node, 0);

    // Count lines of code
    const startLine = node.getStartLineNumber();
    const endLine = node.getEndLineNumber();
    const linesOfCode = endLine - startLine + 1;

    // Count logical lines (non-empty, non-comment lines)
    const text = node.getText();
    logicalLines = text
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
      }).length;

    // Get parameter count
    let parameterCount = 0;
    if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node) || Node.isArrowFunction(node)) {
      parameterCount = (node as any).getParameters?.()?.length || 0;
    }

    // Calculate maintainability index (simplified Halstead-based formula)
    // MI = 171 - 5.2 * ln(HV) - 0.23 * CC - 16.2 * ln(LOC)
    // Simplified: MI = 171 - 0.23 * CC - 16.2 * ln(LOC)
    const maintainabilityIndex = Math.max(
      0,
      Math.min(
        100,
        171 - 0.23 * cyclomaticComplexity - 16.2 * Math.log(Math.max(1, linesOfCode))
      )
    );

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
      logicalLinesOfCode: logicalLines,
      parameterCount,
      nestingDepth: maxNesting,
      maintainabilityIndex: Math.round(maintainabilityIndex),
    };
  }

  private aggregateChildComplexity(children: ExtractedSymbol[]): SymbolComplexityMetrics {
    if (children.length === 0) {
      return { cyclomaticComplexity: 1, cognitiveComplexity: 0, linesOfCode: 0, logicalLinesOfCode: 0, parameterCount: 0, nestingDepth: 0, maintainabilityIndex: 100 };
    }

    const total = children.reduce(
      (acc, child) => ({
        cyclomaticComplexity: acc.cyclomaticComplexity + child.complexity.cyclomaticComplexity,
        cognitiveComplexity: acc.cognitiveComplexity + child.complexity.cognitiveComplexity,
        linesOfCode: acc.linesOfCode + child.complexity.linesOfCode,
        logicalLinesOfCode: acc.logicalLinesOfCode + child.complexity.logicalLinesOfCode,
        parameterCount: acc.parameterCount + child.complexity.parameterCount,
        nestingDepth: Math.max(acc.nestingDepth, child.complexity.nestingDepth),
        maintainabilityIndex: acc.maintainabilityIndex + child.complexity.maintainabilityIndex,
      }),
      { cyclomaticComplexity: 0, cognitiveComplexity: 0, linesOfCode: 0, logicalLinesOfCode: 0, parameterCount: 0, nestingDepth: 0, maintainabilityIndex: 0 }
    );

    return {
      ...total,
      maintainabilityIndex: Math.round(total.maintainabilityIndex / children.length),
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private extractParameters(params: ParameterDeclaration[]): SymbolParameter[] {
    return params.map((p) => ({
      name: p.getName(),
      type: p.getType().getText(),
      optional: p.isOptional(),
      defaultValue: p.getInitializer()?.getText(),
    }));
  }

  private getVisibility(node: MethodDeclaration | PropertyDeclaration | GetAccessorDeclaration | SetAccessorDeclaration): SymbolVisibility {
    if (node.hasModifier(SyntaxKind.PrivateKeyword)) return SymbolVisibility.PRIVATE;
    if (node.hasModifier(SyntaxKind.ProtectedKeyword)) return SymbolVisibility.PROTECTED;
    return SymbolVisibility.PUBLIC;
  }

  private getJsDoc(node: Node): string | undefined {
    const jsDocs = (node as any).getJsDocs?.();
    if (!jsDocs || jsDocs.length === 0) return undefined;
    return jsDocs.map((doc: any) => doc.getText()).join('\n');
  }

  private getFunctionSignature(func: FunctionDeclaration): string {
    const name = func.getName() || 'anonymous';
    const typeParams = func.getTypeParameters().map((tp) => tp.getText()).join(', ');
    const params = func.getParameters().map((p) => p.getText()).join(', ');
    const returnType = func.getReturnType().getText();
    const asyncPrefix = func.isAsync() ? 'async ' : '';
    const typeParamsStr = typeParams ? `<${typeParams}>` : '';
    return `${asyncPrefix}function ${name}${typeParamsStr}(${params}): ${returnType}`;
  }

  private getMethodSignature(method: MethodDeclaration): string {
    const name = method.getName();
    const params = method.getParameters().map((p) => p.getText()).join(', ');
    const returnType = method.getReturnType().getText();
    const asyncPrefix = method.isAsync() ? 'async ' : '';
    const staticPrefix = method.isStatic() ? 'static ' : '';
    return `${staticPrefix}${asyncPrefix}${name}(${params}): ${returnType}`;
  }

  private getClassSignature(cls: ClassDeclaration): string {
    const name = cls.getName() || 'AnonymousClass';
    const typeParams = cls.getTypeParameters().map((tp) => tp.getText()).join(', ');
    const extends_ = cls.getExtends()?.getText();
    const implements_ = cls.getImplements().map((i) => i.getText()).join(', ');

    let sig = `class ${name}`;
    if (typeParams) sig += `<${typeParams}>`;
    if (extends_) sig += ` extends ${extends_}`;
    if (implements_) sig += ` implements ${implements_}`;
    return sig;
  }

  private getInterfaceSignature(iface: InterfaceDeclaration): string {
    const name = iface.getName();
    const typeParams = iface.getTypeParameters().map((tp) => tp.getText()).join(', ');
    const extends_ = iface.getExtends().map((e) => e.getText()).join(', ');

    let sig = `interface ${name}`;
    if (typeParams) sig += `<${typeParams}>`;
    if (extends_) sig += ` extends ${extends_}`;
    return sig;
  }

  private extractPackageName(moduleSpecifier: string): string {
    // Handle scoped packages (@org/package)
    if (moduleSpecifier.startsWith('@')) {
      const parts = moduleSpecifier.split('/');
      return parts.slice(0, 2).join('/');
    }
    // Handle regular packages
    return moduleSpecifier.split('/')[0];
  }

  private flattenSymbols(symbols: ExtractedSymbol[]): ExtractedSymbol[] {
    const result: ExtractedSymbol[] = [];
    const flatten = (syms: ExtractedSymbol[]) => {
      for (const sym of syms) {
        result.push(sym);
        if (sym.children.length > 0) {
          flatten(sym.children);
        }
      }
    };
    flatten(symbols);
    return result;
  }
}
