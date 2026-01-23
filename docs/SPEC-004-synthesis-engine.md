# SPEC-004: Synthesis Engine Technical Specification

## Document Information
| Field | Value |
|-------|-------|
| **Component** | Synthesis Engine |
| **Author** | Kevin Owens <kevin.a.owens@gmail.com> |
| **Status** | Draft |
| **Last Updated** | January 2026 |
| **Related PRD** | PRD-002: Intent Graph |

---

## Overview

The Synthesis Engine transforms Intent Graphs into working code and other artifacts. It is the core component that makes "intent as source of truth" practical by generating high-quality, provenance-tracked outputs from semantic specifications.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       SYNTHESIS ENGINE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      INPUT PROCESSING                            │   │
│  │                                                                  │   │
│  │  Intent Graph ──► Validation ──► Dependency Resolution ──►      │   │
│  │                                                                  │   │
│  └─────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────▼───────────────────────────────┐   │
│  │                     PLANNING LAYER                               │   │
│  │                                                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │  Target     │  │ Architecture│  │   Task      │             │   │
│  │  │  Analysis   │  │  Selection  │  │  Breakdown  │             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  └─────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────▼───────────────────────────────┐   │
│  │                   GENERATION LAYER                               │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐   │   │
│  │  │                   Claude API                             │   │   │
│  │  │  (with specialized synthesis prompts)                    │   │   │
│  │  └─────────────────────────────────────────────────────────┘   │   │
│  │                                                                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │   │
│  │  │  Entity  │ │ Behavior │ │   API    │ │   Test   │          │   │
│  │  │Generator │ │Generator │ │Generator │ │Generator │          │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │   │
│  └─────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                    │
│  ┌─────────────────────────────────▼───────────────────────────────┐   │
│  │                    ASSEMBLY LAYER                                │   │
│  │                                                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │   │
│  │  │  Code       │  │ Provenance  │  │  Artifact   │             │   │
│  │  │  Assembly   │  │  Embedding  │  │  Creation   │             │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Synthesis Pipeline

### Pipeline Stages

```typescript
interface SynthesisPipeline {
  // Stage 1: Validate and prepare
  validate(graph: IntentGraph): ValidationResult;
  
  // Stage 2: Plan synthesis
  plan(graph: IntentGraph, target: SynthesisTarget): SynthesisPlan;
  
  // Stage 3: Generate components
  generate(plan: SynthesisPlan): GenerationResult[];
  
  // Stage 4: Assemble outputs
  assemble(results: GenerationResult[]): SynthesisOutput;
  
  // Stage 5: Create artifacts
  createArtifacts(output: SynthesisOutput): Artifact[];
}
```

### Synthesis Targets

```typescript
type SynthesisTarget = {
  // Language/framework
  language: 'typescript' | 'python' | 'go' | 'rust';
  framework?: string; // 'react', 'fastapi', 'gin', etc.
  
  // Output type
  outputType: 'frontend' | 'backend' | 'fullstack' | 'library' | 'cli';
  
  // Configuration
  config: {
    styling?: 'tailwind' | 'css-modules' | 'styled-components';
    testing?: 'jest' | 'pytest' | 'vitest';
    stateManagement?: 'redux' | 'zustand' | 'context';
    database?: 'postgresql' | 'mongodb' | 'sqlite';
    authentication?: 'jwt' | 'session' | 'oauth';
  };
  
  // Optimization profile
  profile: 'development' | 'production' | 'minimal';
};
```

---

## Stage 1: Validation

### Validation Rules

```typescript
async function validateForSynthesis(
  graph: IntentGraph
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // 1. Structural validation
  if (!graph.goals || graph.goals.length === 0) {
    errors.push({
      code: 'NO_GOALS',
      message: 'Intent graph must have at least one goal',
      path: 'goals'
    });
  }
  
  // 2. Completeness checks
  for (const behavior of graph.behaviors || []) {
    if (!behavior.steps || behavior.steps.length === 0) {
      warnings.push({
        code: 'EMPTY_BEHAVIOR',
        message: `Behavior "${behavior.name}" has no steps`,
        path: `behaviors.${behavior.id}`,
        suggestion: 'Add steps or remove behavior'
      });
    }
    
    // Check entity references
    for (const entityId of behavior.linkedEntityIds || []) {
      if (!graph.entities?.find(e => e.id === entityId)) {
        errors.push({
          code: 'MISSING_ENTITY_REF',
          message: `Behavior "${behavior.name}" references non-existent entity`,
          path: `behaviors.${behavior.id}.linkedEntityIds`
        });
      }
    }
  }
  
  // 3. Constraint consistency
  const conflictingConstraints = findConflictingConstraints(graph.constraints);
  for (const conflict of conflictingConstraints) {
    errors.push({
      code: 'CONFLICTING_CONSTRAINTS',
      message: `Constraints conflict: "${conflict.a.description}" vs "${conflict.b.description}"`,
      path: 'constraints'
    });
  }
  
  // 4. Entity relationship validation
  for (const entity of graph.entities || []) {
    for (const rel of entity.relationships || []) {
      const target = graph.entities?.find(e => e.id === rel.targetEntityId);
      if (!target) {
        errors.push({
          code: 'MISSING_RELATIONSHIP_TARGET',
          message: `Entity "${entity.name}" has relationship to non-existent entity`,
          path: `entities.${entity.id}.relationships`
        });
      }
    }
  }
  
  // 5. Synthesis feasibility
  const synthesisChecks = await checkSynthesisFeasibility(graph);
  errors.push(...synthesisChecks.errors);
  warnings.push(...synthesisChecks.warnings);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    completeness: calculateCompleteness(graph)
  };
}

function calculateCompleteness(graph: IntentGraph): number {
  let score = 0;
  let total = 0;
  
  // Goals
  total += 20;
  if (graph.goals?.length > 0) score += 10;
  if (graph.goals?.every(g => g.successCriteria?.length > 0)) score += 10;
  
  // Entities
  total += 20;
  if (graph.entities?.length > 0) score += 10;
  if (graph.entities?.every(e => e.attributes?.length > 0)) score += 10;
  
  // Behaviors
  total += 30;
  if (graph.behaviors?.length > 0) score += 10;
  if (graph.behaviors?.every(b => b.steps?.length > 0)) score += 10;
  if (graph.behaviors?.every(b => b.errorHandlers?.length > 0)) score += 10;
  
  // Constraints
  total += 20;
  if (graph.constraints?.length > 0) score += 10;
  if (graph.constraints?.some(c => c.verificationMethod)) score += 10;
  
  // Context
  total += 10;
  if (graph.contexts?.length > 0) score += 10;
  
  return Math.round((score / total) * 100);
}
```

---

## Stage 2: Planning

### Architecture Selection

```typescript
interface SynthesisPlan {
  target: SynthesisTarget;
  architecture: ArchitecturePlan;
  tasks: SynthesisTask[];
  dependencies: TaskDependency[];
  estimatedTokens: number;
  estimatedTime: number;
}

async function planSynthesis(
  graph: IntentGraph,
  target: SynthesisTarget
): Promise<SynthesisPlan> {
  // 1. Select architecture based on intent
  const architecture = selectArchitecture(graph, target);
  
  // 2. Break down into tasks
  const tasks = createSynthesisTasks(graph, architecture);
  
  // 3. Resolve dependencies
  const dependencies = resolveDependencies(tasks);
  
  // 4. Estimate resources
  const estimates = estimateResources(tasks);
  
  return {
    target,
    architecture,
    tasks,
    dependencies,
    ...estimates
  };
}

function selectArchitecture(
  graph: IntentGraph,
  target: SynthesisTarget
): ArchitecturePlan {
  const patterns: ArchitecturePattern[] = [];
  
  // Analyze entities for data patterns
  if (graph.entities && graph.entities.length > 0) {
    patterns.push({
      type: 'data_layer',
      pattern: selectDataPattern(graph.entities, target)
    });
  }
  
  // Analyze behaviors for API patterns
  const apiBehaviors = graph.behaviors?.filter(b => 
    b.trigger.type === 'api_call' || b.trigger.type === 'user_action'
  );
  if (apiBehaviors && apiBehaviors.length > 0) {
    patterns.push({
      type: 'api_layer',
      pattern: selectApiPattern(apiBehaviors, target)
    });
  }
  
  // Analyze constraints for cross-cutting concerns
  const securityConstraints = graph.constraints?.filter(c => 
    c.category === 'security'
  );
  if (securityConstraints && securityConstraints.length > 0) {
    patterns.push({
      type: 'security',
      pattern: selectSecurityPattern(securityConstraints, target)
    });
  }
  
  return {
    patterns,
    fileStructure: generateFileStructure(patterns, target),
    conventions: selectConventions(target)
  };
}

function createSynthesisTasks(
  graph: IntentGraph,
  architecture: ArchitecturePlan
): SynthesisTask[] {
  const tasks: SynthesisTask[] = [];
  
  // Entity tasks
  for (const entity of graph.entities || []) {
    tasks.push({
      id: `entity_${entity.id}`,
      type: 'entity',
      input: entity,
      outputPath: getEntityPath(entity, architecture),
      priority: 1
    });
  }
  
  // Behavior tasks
  for (const behavior of graph.behaviors || []) {
    tasks.push({
      id: `behavior_${behavior.id}`,
      type: 'behavior',
      input: behavior,
      outputPath: getBehaviorPath(behavior, architecture),
      priority: 2,
      dependsOn: behavior.linkedEntityIds?.map(id => `entity_${id}`)
    });
  }
  
  // API tasks
  tasks.push({
    id: 'api_routes',
    type: 'api',
    input: graph.behaviors?.filter(b => b.trigger.type === 'api_call'),
    outputPath: architecture.fileStructure.apiRoutes,
    priority: 3,
    dependsOn: graph.behaviors?.map(b => `behavior_${b.id}`)
  });
  
  // Test tasks
  for (const entity of graph.entities || []) {
    tasks.push({
      id: `test_entity_${entity.id}`,
      type: 'test',
      input: { entity, constraints: graph.constraints },
      outputPath: getTestPath(entity, architecture),
      priority: 4,
      dependsOn: [`entity_${entity.id}`]
    });
  }
  
  return tasks;
}
```

---

## Stage 3: Generation

### Generator Interface

```typescript
interface Generator {
  type: string;
  generate(task: SynthesisTask, context: GenerationContext): Promise<GenerationResult>;
}

interface GenerationContext {
  graph: IntentGraph;
  target: SynthesisTarget;
  architecture: ArchitecturePlan;
  previousResults: Map<string, GenerationResult>;
  customizations: Map<string, Customization>;
}

interface GenerationResult {
  taskId: string;
  success: boolean;
  content: string;
  contentType: string;
  provenance: ProvenanceInfo[];
  warnings: string[];
  errors?: string[];
}

interface ProvenanceInfo {
  lineStart: number;
  lineEnd: number;
  intentNodeIds: string[];
  intentNodeTypes: string[];
  description: string;
}
```

### Entity Generator

```typescript
class EntityGenerator implements Generator {
  type = 'entity';
  
  async generate(
    task: SynthesisTask,
    context: GenerationContext
  ): Promise<GenerationResult> {
    const entity = task.input as Entity;
    const provenance: ProvenanceInfo[] = [];
    
    // Build prompt for Claude
    const prompt = this.buildEntityPrompt(entity, context);
    
    // Call Claude API
    const response = await claude.complete({
      model: 'claude-sonnet-4-20250514',
      system: this.getSystemPrompt(context.target),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000
    });
    
    // Parse response
    const code = this.extractCode(response.content);
    
    // Build provenance
    provenance.push({
      lineStart: 1,
      lineEnd: code.split('\n').length,
      intentNodeIds: [entity.id],
      intentNodeTypes: ['entity'],
      description: `Entity: ${entity.name}`
    });
    
    // Add attribute-level provenance
    for (const attr of entity.attributes || []) {
      const lineNum = this.findAttributeLine(code, attr.name);
      if (lineNum) {
        provenance.push({
          lineStart: lineNum,
          lineEnd: lineNum,
          intentNodeIds: [entity.id],
          intentNodeTypes: ['entity'],
          description: `Attribute: ${attr.name}`
        });
      }
    }
    
    return {
      taskId: task.id,
      success: true,
      content: code,
      contentType: this.getContentType(context.target),
      provenance,
      warnings: []
    };
  }
  
  private buildEntityPrompt(entity: Entity, context: GenerationContext): string {
    const target = context.target;
    
    return `Generate a ${target.language} ${target.framework || ''} entity/model for:

Entity: ${entity.name}
Description: ${entity.description || 'No description'}

Attributes:
${entity.attributes?.map(a => `- ${a.name}: ${JSON.stringify(a.dataType)} ${a.required ? '(required)' : ''} ${a.unique ? '(unique)' : ''}`).join('\n')}

Relationships:
${entity.relationships?.map(r => `- ${r.name}: ${r.type} -> ${this.getEntityName(r.targetEntityId, context)}`).join('\n') || 'None'}

${entity.stateMachine ? `State Machine:
States: ${entity.stateMachine.states.map(s => s.name).join(', ')}
Initial: ${entity.stateMachine.initialState}
Transitions:
${entity.stateMachine.transitions?.map(t => `- ${t.from} -> ${t.to} on ${t.trigger}`).join('\n')}` : ''}

Validation Rules:
${entity.validationRules?.map(r => `- ${r.expression}: "${r.message}"`).join('\n') || 'None'}

Requirements:
- Use TypeScript strict mode
- Include JSDoc comments
- Include validation decorators/functions
- Follow ${target.framework || target.language} conventions
- Make it production-ready`;
  }
}
```

### Behavior Generator

```typescript
class BehaviorGenerator implements Generator {
  type = 'behavior';
  
  async generate(
    task: SynthesisTask,
    context: GenerationContext
  ): Promise<GenerationResult> {
    const behavior = task.input as Behavior;
    const provenance: ProvenanceInfo[] = [];
    
    // Get related entities
    const entities = behavior.linkedEntityIds?.map(id => 
      context.graph.entities?.find(e => e.id === id)
    ).filter(Boolean);
    
    // Get related constraints
    const constraints = behavior.linkedConstraintIds?.map(id =>
      context.graph.constraints?.find(c => c.id === id)
    ).filter(Boolean);
    
    const prompt = this.buildBehaviorPrompt(behavior, entities, constraints, context);
    
    const response = await claude.complete({
      model: 'claude-sonnet-4-20250514',
      system: this.getSystemPrompt(context.target),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8000
    });
    
    const code = this.extractCode(response.content);
    
    // Build detailed provenance
    let currentLine = 1;
    for (const step of behavior.steps || []) {
      const stepCode = this.findStepInCode(code, step);
      if (stepCode) {
        provenance.push({
          lineStart: stepCode.start,
          lineEnd: stepCode.end,
          intentNodeIds: [behavior.id],
          intentNodeTypes: ['behavior'],
          description: `Step ${step.order}: ${step.description}`
        });
      }
    }
    
    // Add constraint provenance
    for (const constraint of constraints || []) {
      const constraintCode = this.findConstraintInCode(code, constraint);
      if (constraintCode) {
        provenance.push({
          lineStart: constraintCode.start,
          lineEnd: constraintCode.end,
          intentNodeIds: [constraint.id],
          intentNodeTypes: ['constraint'],
          description: `Constraint: ${constraint.description}`
        });
      }
    }
    
    return {
      taskId: task.id,
      success: true,
      content: code,
      contentType: this.getContentType(context.target),
      provenance,
      warnings: []
    };
  }
  
  private buildBehaviorPrompt(
    behavior: Behavior,
    entities: (Entity | undefined)[],
    constraints: (Constraint | undefined)[],
    context: GenerationContext
  ): string {
    return `Generate a ${context.target.language} implementation for this behavior:

Behavior: ${behavior.name}
Description: ${behavior.description || 'No description'}

Trigger: ${behavior.trigger.type}
${behavior.trigger.description}
${behavior.trigger.parameters ? `Parameters: ${JSON.stringify(behavior.trigger.parameters)}` : ''}

Preconditions:
${behavior.preconditions?.map(p => `- ${p}`).join('\n') || 'None'}

Steps:
${behavior.steps?.map(s => `${s.order}. [${s.actor}] ${s.description}${s.condition ? ` (if ${s.condition})` : ''}`).join('\n')}

Postconditions:
${behavior.postconditions?.map(p => `- ${p}`).join('\n') || 'None'}

Error Handlers:
${behavior.errorHandlers?.map(e => `- ${e.errorType}: ${e.handling}${e.userMessage ? ` ("${e.userMessage}")` : ''}`).join('\n') || 'None'}

Related Entities:
${entities?.map(e => `- ${e?.name}: ${e?.attributes?.map(a => a.name).join(', ')}`).join('\n') || 'None'}

Constraints to Enforce:
${constraints?.map(c => `- [${c?.severity}] ${c?.description}`).join('\n') || 'None'}

Requirements:
- Implement all steps in order
- Handle all error cases
- Enforce all constraints
- Use async/await where appropriate
- Include comprehensive logging
- Make it production-ready`;
  }
}
```

### Test Generator

```typescript
class TestGenerator implements Generator {
  type = 'test';
  
  async generate(
    task: SynthesisTask,
    context: GenerationContext
  ): Promise<GenerationResult> {
    const { entity, constraints } = task.input;
    
    // Get the generated entity code
    const entityResult = context.previousResults.get(`entity_${entity.id}`);
    
    const prompt = this.buildTestPrompt(entity, entityResult?.content, constraints, context);
    
    const response = await claude.complete({
      model: 'claude-sonnet-4-20250514',
      system: this.getTestSystemPrompt(context.target),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 6000
    });
    
    const code = this.extractCode(response.content);
    
    const provenance: ProvenanceInfo[] = [{
      lineStart: 1,
      lineEnd: code.split('\n').length,
      intentNodeIds: [entity.id, ...constraints.map(c => c.id)],
      intentNodeTypes: ['entity', ...constraints.map(() => 'constraint')],
      description: `Tests for ${entity.name}`
    }];
    
    return {
      taskId: task.id,
      success: true,
      content: code,
      contentType: this.getContentType(context.target),
      provenance,
      warnings: []
    };
  }
  
  private buildTestPrompt(
    entity: Entity,
    entityCode: string | undefined,
    constraints: Constraint[],
    context: GenerationContext
  ): string {
    return `Generate comprehensive tests for this entity:

Entity: ${entity.name}
${entityCode ? `\nImplementation:\n\`\`\`\n${entityCode}\n\`\`\`` : ''}

Attributes to test:
${entity.attributes?.map(a => `- ${a.name}: ${JSON.stringify(a.dataType)} ${a.required ? '(required)' : ''}`).join('\n')}

Validation rules:
${entity.validationRules?.map(r => `- ${r.expression}: "${r.message}"`).join('\n') || 'None'}

Constraints to verify:
${constraints.map(c => `- ${c.description}${c.verificationMethod ? ` (verify: ${c.verificationMethod})` : ''}`).join('\n')}

Requirements:
- Test all CRUD operations
- Test all validation rules
- Test all constraints
- Include edge cases
- Include error cases
- Use ${context.target.config.testing || 'jest'} framework
- Aim for >90% coverage`;
  }
}
```

---

## Stage 4: Assembly

### Code Assembly

```typescript
async function assembleOutput(
  results: GenerationResult[],
  plan: SynthesisPlan
): Promise<SynthesisOutput> {
  const files: SynthesizedFile[] = [];
  const allProvenance: ProvenanceInfo[] = [];
  
  // Group results by output path
  const byPath = groupBy(results, r => plan.tasks.find(t => t.id === r.taskId)?.outputPath);
  
  for (const [path, pathResults] of Object.entries(byPath)) {
    if (!path) continue;
    
    // Combine content if multiple results for same file
    const content = pathResults.map(r => r.content).join('\n\n');
    
    // Adjust provenance line numbers
    let lineOffset = 0;
    for (const result of pathResults) {
      for (const prov of result.provenance) {
        allProvenance.push({
          ...prov,
          lineStart: prov.lineStart + lineOffset,
          lineEnd: prov.lineEnd + lineOffset,
          filePath: path
        });
      }
      lineOffset += result.content.split('\n').length + 2;
    }
    
    files.push({
      path,
      content,
      contentType: pathResults[0].contentType
    });
  }
  
  // Generate index/barrel files
  const indexFiles = generateIndexFiles(files, plan.architecture);
  files.push(...indexFiles);
  
  // Generate config files
  const configFiles = generateConfigFiles(plan);
  files.push(...configFiles);
  
  return {
    files,
    provenance: allProvenance,
    plan,
    stats: {
      totalFiles: files.length,
      totalLines: files.reduce((sum, f) => sum + f.content.split('\n').length, 0),
      intentNodesCovered: new Set(allProvenance.flatMap(p => p.intentNodeIds)).size
    }
  };
}
```

### Provenance Embedding

```typescript
function embedProvenance(
  file: SynthesizedFile,
  provenance: ProvenanceInfo[]
): string {
  const fileProvenance = provenance.filter(p => p.filePath === file.path);
  const lines = file.content.split('\n');
  const result: string[] = [];
  
  // Group provenance by line range
  const byRange = groupBy(fileProvenance, p => `${p.lineStart}-${p.lineEnd}`);
  
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    
    // Check if this line starts a provenance block
    const startingHere = fileProvenance.filter(p => p.lineStart === lineNum);
    for (const prov of startingHere) {
      const comment = formatProvenanceComment(prov, file.contentType);
      result.push(comment);
    }
    
    result.push(lines[i]);
  }
  
  return result.join('\n');
}

function formatProvenanceComment(
  prov: ProvenanceInfo,
  contentType: string
): string {
  const ids = prov.intentNodeIds.join(',');
  const types = prov.intentNodeTypes.join(',');
  
  const content = `@intent [${types}:${ids}] ${prov.description}`;
  
  switch (contentType) {
    case 'text/typescript':
    case 'text/javascript':
      return `// ${content}`;
    case 'text/python':
      return `# ${content}`;
    case 'text/html':
      return `<!-- ${content} -->`;
    default:
      return `// ${content}`;
  }
}
```

---

## Evolution Synthesis

### Evolving Existing Artifacts

```typescript
async function synthesizeEvolution(
  artifact: Artifact,
  currentContent: string,
  intentChanges: IntentChange[],
  graph: IntentGraph
): Promise<EvolutionSynthesis> {
  // 1. Analyze current code structure
  const codeAnalysis = await analyzeCode(currentContent, artifact.contentType);
  
  // 2. Map changes to affected code regions
  const affectedRegions = mapChangesToCode(
    intentChanges,
    artifact.intentLinks,
    codeAnalysis
  );
  
  // 3. Build evolution prompt
  const prompt = buildEvolutionPrompt(
    currentContent,
    affectedRegions,
    intentChanges,
    graph
  );
  
  // 4. Generate updated code
  const response = await claude.complete({
    model: 'claude-sonnet-4-20250514',
    system: getEvolutionSystemPrompt(),
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 8000
  });
  
  // 5. Parse response
  const { newContent, changes } = parseEvolutionResponse(response.content);
  
  // 6. Generate diff
  const diff = generateDiff(currentContent, newContent);
  
  return {
    originalContent: currentContent,
    newContent,
    diff,
    changes,
    intentChanges,
    affectedRegions
  };
}

function buildEvolutionPrompt(
  currentContent: string,
  affectedRegions: CodeRegion[],
  intentChanges: IntentChange[],
  graph: IntentGraph
): string {
  return `Evolve this code based on intent changes:

Current Code:
\`\`\`
${currentContent}
\`\`\`

Intent Changes:
${intentChanges.map(c => `- ${c.changeType}: ${c.description}
  Before: ${JSON.stringify(c.before)}
  After: ${JSON.stringify(c.after)}`).join('\n\n')}

Affected Code Regions:
${affectedRegions.map(r => `- Lines ${r.start}-${r.end}: ${r.description}`).join('\n')}

Current Full Intent (for context):
${JSON.stringify(graph, null, 2)}

Requirements:
1. Only modify code affected by the intent changes
2. Preserve all unaffected code exactly
3. Maintain code style and conventions
4. Update comments/docs to reflect changes
5. Return the complete updated file

Respond with:
1. Summary of changes made
2. The complete updated code
3. List of specific modifications`;
}
```

---

## Customization Preservation

### Tracking Manual Edits

```typescript
interface Customization {
  artifactId: string;
  version: number;
  region: CodeRegion;
  originalContent: string;
  customContent: string;
  reason?: string;
  preserveOnResynthesize: boolean;
}

async function detectCustomizations(
  artifact: Artifact,
  currentContent: string
): Promise<Customization[]> {
  // Get the generated version
  const generatedVersion = await getLastSynthesizedVersion(artifact.id);
  if (!generatedVersion) return [];
  
  const generatedContent = await contentStorage.retrieve(generatedVersion.storageKey);
  
  // Diff to find changes
  const diffs = diffLines(generatedContent.toString(), currentContent);
  
  const customizations: Customization[] = [];
  let lineNum = 1;
  
  for (const diff of diffs) {
    if (diff.added || diff.removed) {
      customizations.push({
        artifactId: artifact.id,
        version: artifact.version,
        region: {
          start: lineNum,
          end: lineNum + (diff.count || 1) - 1
        },
        originalContent: diff.removed ? diff.value : '',
        customContent: diff.added ? diff.value : '',
        preserveOnResynthesize: true
      });
    }
    if (!diff.removed) {
      lineNum += diff.count || 1;
    }
  }
  
  return customizations;
}

async function synthesizeWithCustomizations(
  graph: IntentGraph,
  target: SynthesisTarget,
  customizations: Customization[]
): Promise<SynthesisOutput> {
  // 1. Normal synthesis
  const output = await synthesize(graph, target);
  
  // 2. Apply customizations
  for (const custom of customizations.filter(c => c.preserveOnResynthesize)) {
    const file = output.files.find(f => f.artifactId === custom.artifactId);
    if (file) {
      file.content = applyCustomization(file.content, custom);
      file.hasCustomizations = true;
    }
  }
  
  return output;
}
```

---

## API Endpoints

```yaml
paths:
  /api/v1/synthesis/validate:
    post:
      summary: Validate intent graph for synthesis
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [intentGraphId]
              properties:
                intentGraphId: { type: string }
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ValidationResult' }

  /api/v1/synthesis/plan:
    post:
      summary: Create synthesis plan
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [intentGraphId, target]
              properties:
                intentGraphId: { type: string }
                target: { $ref: '#/components/schemas/SynthesisTarget' }
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/SynthesisPlan' }

  /api/v1/synthesis/execute:
    post:
      summary: Execute synthesis
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [planId]
              properties:
                planId: { type: string }
                createArtifacts: { type: boolean, default: true }
      responses:
        202:
          content:
            application/json:
              schema:
                type: object
                properties:
                  jobId: { type: string }
                  status: { type: string }

  /api/v1/synthesis/jobs/{jobId}:
    get:
      summary: Get synthesis job status
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/SynthesisJob' }

  /api/v1/synthesis/evolve:
    post:
      summary: Synthesize evolution for artifact
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [artifactId, intentChanges]
              properties:
                artifactId: { type: string }
                intentChanges: { type: array }
      responses:
        200:
          content:
            application/json:
              schema: { $ref: '#/components/schemas/EvolutionSynthesis' }
```

---

## Related Documents

- PRD-002: Intent Graph
- ADR-001: Intent as Source of Truth
- SPEC-002: Intent Graph Schema
- SPEC-003: Artifact Lifecycle
