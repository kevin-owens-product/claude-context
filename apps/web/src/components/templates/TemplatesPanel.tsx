/**
 * TemplatesPanel - Pre-built templates for quick creation
 * Feature, Bug, Task, Spike, and custom templates
 */

import { useState } from 'react';
import { clsx } from 'clsx';
import {
  FileText,
  Plus,
  Search,
  Star,
  Sparkles,
  Bug,
  Zap,
  Lightbulb,
  TestTube,
  FileCode,
  Layers,
  Settings,
  ArrowRight,
  CheckCircle,
  Edit3,
  X,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof templateIcons;
  category: 'development' | 'research' | 'operations' | 'custom';
  isCustom?: boolean;
  isFavorite?: boolean;
  fields: {
    name: string;
    prefix: string;
    defaultPriority: 'low' | 'medium' | 'high' | 'critical';
    defaultLabels: string[];
    checklist?: string[];
    description?: string;
  };
  usageCount: number;
}

interface TemplatesPanelProps {
  onSelectTemplate: (template: Template) => void;
  isOpen: boolean;
  onClose: () => void;
}

const templateIcons = {
  feature: Sparkles,
  bug: Bug,
  task: CheckCircle,
  spike: Lightbulb,
  test: TestTube,
  refactor: FileCode,
  epic: Layers,
  improvement: Zap,
  custom: FileText,
};

const defaultTemplates: Template[] = [
  {
    id: 'feature',
    name: 'Feature',
    description: 'New functionality or capability',
    icon: 'feature',
    category: 'development',
    fields: {
      name: 'New Feature',
      prefix: 'FEAT',
      defaultPriority: 'medium',
      defaultLabels: ['feature', 'enhancement'],
      checklist: [
        'Requirements defined',
        'Technical design reviewed',
        'Tests written',
        'Documentation updated',
        'Code reviewed',
      ],
      description: '## Overview\n\n## Acceptance Criteria\n- [ ] \n\n## Technical Notes\n',
    },
    usageCount: 47,
    isFavorite: true,
  },
  {
    id: 'bug',
    name: 'Bug Fix',
    description: 'Something isn\'t working as expected',
    icon: 'bug',
    category: 'development',
    fields: {
      name: 'Bug Fix',
      prefix: 'BUG',
      defaultPriority: 'high',
      defaultLabels: ['bug', 'fix'],
      checklist: [
        'Bug reproduced',
        'Root cause identified',
        'Fix implemented',
        'Regression tests added',
        'Fix verified',
      ],
      description: '## Bug Description\n\n## Steps to Reproduce\n1. \n\n## Expected Behavior\n\n## Actual Behavior\n',
    },
    usageCount: 32,
    isFavorite: true,
  },
  {
    id: 'task',
    name: 'Task',
    description: 'General work item or action',
    icon: 'task',
    category: 'operations',
    fields: {
      name: 'Task',
      prefix: 'TASK',
      defaultPriority: 'medium',
      defaultLabels: ['task'],
      description: '## Task Description\n\n## Definition of Done\n- [ ] ',
    },
    usageCount: 89,
  },
  {
    id: 'spike',
    name: 'Spike / Research',
    description: 'Investigation or proof of concept',
    icon: 'spike',
    category: 'research',
    fields: {
      name: 'Research Spike',
      prefix: 'SPIKE',
      defaultPriority: 'medium',
      defaultLabels: ['spike', 'research'],
      checklist: [
        'Research questions defined',
        'Options explored',
        'Findings documented',
        'Recommendation made',
      ],
      description: '## Research Questions\n1. \n\n## Time Box\n\n## Findings\n',
    },
    usageCount: 15,
  },
  {
    id: 'test',
    name: 'Test / QA',
    description: 'Testing and quality assurance work',
    icon: 'test',
    category: 'development',
    fields: {
      name: 'Test Task',
      prefix: 'TEST',
      defaultPriority: 'medium',
      defaultLabels: ['test', 'qa'],
      checklist: [
        'Test cases written',
        'Tests executed',
        'Results documented',
        'Issues filed',
      ],
      description: '## Test Scope\n\n## Test Cases\n- [ ] \n\n## Results\n',
    },
    usageCount: 21,
  },
  {
    id: 'refactor',
    name: 'Refactor',
    description: 'Code improvement without changing behavior',
    icon: 'refactor',
    category: 'development',
    fields: {
      name: 'Refactor',
      prefix: 'REFACTOR',
      defaultPriority: 'low',
      defaultLabels: ['refactor', 'tech-debt'],
      checklist: [
        'Current state documented',
        'Target state defined',
        'Tests passing before',
        'Refactor complete',
        'Tests passing after',
      ],
      description: '## Current State\n\n## Proposed Changes\n\n## Benefits\n',
    },
    usageCount: 12,
  },
  {
    id: 'epic',
    name: 'Epic',
    description: 'Large body of work with multiple tasks',
    icon: 'epic',
    category: 'development',
    fields: {
      name: 'Epic',
      prefix: 'EPIC',
      defaultPriority: 'high',
      defaultLabels: ['epic'],
      description: '## Epic Overview\n\n## Goals\n- \n\n## Child Items\n- [ ] \n\n## Success Metrics\n',
    },
    usageCount: 8,
  },
  {
    id: 'improvement',
    name: 'Improvement',
    description: 'Enhance existing functionality',
    icon: 'improvement',
    category: 'development',
    fields: {
      name: 'Improvement',
      prefix: 'IMP',
      defaultPriority: 'medium',
      defaultLabels: ['improvement', 'enhancement'],
      description: '## Current Behavior\n\n## Desired Improvement\n\n## Expected Impact\n',
    },
    usageCount: 28,
  },
];

export function TemplatesPanel({ onSelectTemplate, isOpen, onClose }: TemplatesPanelProps) {
  const [templates] = useState<Template[]>(defaultTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | Template['category']>('all');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.usageCount - a.usageCount;
  });

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'development', label: 'Development' },
    { id: 'research', label: 'Research' },
    { id: 'operations', label: 'Operations' },
    { id: 'custom', label: 'Custom' },
  ] as const;

  const categoryColors = {
    development: 'bg-blue-500/20 text-blue-400',
    research: 'bg-purple-500/20 text-purple-400',
    operations: 'bg-green-500/20 text-green-400',
    custom: 'bg-yellow-500/20 text-yellow-400',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-3xl max-h-[80vh] bg-claude-neutral-900 rounded-2xl border border-claude-neutral-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-claude-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-claude-neutral-100">Templates</h2>
              <p className="text-sm text-claude-neutral-500">Quick-start with pre-built templates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-claude-primary-500/20 text-claude-primary-400 rounded-lg text-sm hover:bg-claude-primary-500/30 transition-colors">
              <Plus className="w-4 h-4" />
              Create Template
            </button>
            <button
              onClick={onClose}
              className="p-2 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="px-6 py-3 border-b border-claude-neutral-800">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-500" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-200 placeholder-claude-neutral-500 focus:outline-none focus:border-claude-primary-500"
              />
            </div>
            <div className="flex items-center gap-1">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as typeof selectedCategory)}
                  className={clsx(
                    'px-3 py-1.5 text-sm rounded-lg transition-colors',
                    selectedCategory === cat.id
                      ? 'bg-claude-primary-500/20 text-claude-primary-400'
                      : 'text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-auto p-6">
          {sortedTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-claude-neutral-600 mb-3" />
              <p className="text-claude-neutral-400">No templates found</p>
              <p className="text-sm text-claude-neutral-500 mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {sortedTemplates.map(template => {
                const Icon = templateIcons[template.icon];
                const isHovered = hoveredTemplate === template.id;

                return (
                  <div
                    key={template.id}
                    className={clsx(
                      'relative p-4 rounded-xl border transition-all cursor-pointer',
                      isHovered
                        ? 'bg-claude-neutral-800 border-claude-primary-500/50'
                        : 'bg-claude-neutral-850 border-claude-neutral-800 hover:border-claude-neutral-700'
                    )}
                    onMouseEnter={() => setHoveredTemplate(template.id)}
                    onMouseLeave={() => setHoveredTemplate(null)}
                    onClick={() => {
                      onSelectTemplate(template);
                      onClose();
                    }}
                  >
                    {/* Favorite indicator */}
                    {template.isFavorite && (
                      <Star className="absolute top-3 right-3 w-4 h-4 text-yellow-400 fill-yellow-400" />
                    )}

                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        'p-2 rounded-lg',
                        categoryColors[template.category]
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-claude-neutral-200">
                          {template.name}
                        </h3>
                        <p className="text-xs text-claude-neutral-500 mt-0.5">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={clsx(
                            'px-2 py-0.5 text-xs rounded-full',
                            categoryColors[template.category]
                          )}>
                            {template.category}
                          </span>
                          <span className="text-xs text-claude-neutral-500">
                            Used {template.usageCount} times
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Hover actions */}
                    {isHovered && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-1">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            // Preview action
                          }}
                          className="p-1.5 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-700 rounded transition-colors"
                          title="Preview"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onSelectTemplate(template);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-claude-primary-500 text-white rounded text-xs hover:bg-claude-primary-600 transition-colors"
                        >
                          Use
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-claude-neutral-800 bg-claude-neutral-850">
          <span className="text-xs text-claude-neutral-500">
            {sortedTemplates.length} templates available
          </span>
          <button className="flex items-center gap-1.5 text-xs text-claude-neutral-400 hover:text-claude-neutral-200 transition-colors">
            <Settings className="w-3.5 h-3.5" />
            Manage Templates
          </button>
        </div>
      </div>
    </div>
  );
}
