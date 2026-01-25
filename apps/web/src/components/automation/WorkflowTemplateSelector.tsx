/**
 * WorkflowTemplateSelector - Browse and apply pre-built workflow templates
 * @prompt-id forge-v4.1:ui:component:workflow-template-selector:001
 * @generated-at 2026-01-24T00:00:00Z
 * @model claude-opus-4-5
 */

import { useState, useMemo } from 'react';
import {
  Search,
  Zap,
  Bell,
  UserCheck,
  GitMerge,
  Link2,
  ChevronRight,
  X,
  Check,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { WorkflowTemplate, TemplateVariable } from '../../api/workflows';

interface WorkflowTemplateSelectorProps {
  templates: WorkflowTemplate[];
  onSelect: (template: WorkflowTemplate, variables: Record<string, unknown>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const categoryIcons = {
  escalation: Zap,
  notification: Bell,
  assignment: UserCheck,
  status: GitMerge,
  integration: Link2,
};

const categoryColors = {
  escalation: 'text-orange-400 bg-orange-500/10',
  notification: 'text-blue-400 bg-blue-500/10',
  assignment: 'text-purple-400 bg-purple-500/10',
  status: 'text-green-400 bg-green-500/10',
  integration: 'text-cyan-400 bg-cyan-500/10',
};

export function WorkflowTemplateSelector({
  templates,
  onSelect,
  onCancel,
  isLoading = false,
}: WorkflowTemplateSelectorProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState<'browse' | 'configure'>('browse');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(templates.map(t => t.category))];
    return cats.sort();
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (selectedCategory && t.category !== selectedCategory) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [templates, selectedCategory, search]);

  // Initialize variables with defaults when template is selected
  const handleTemplateSelect = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    const initialVars: Record<string, unknown> = {};
    template.variables?.forEach(v => {
      if (v.defaultValue !== undefined) {
        initialVars[v.key] = v.defaultValue;
      }
    });
    setVariables(initialVars);
    setStep('configure');
  };

  // Handle variable change
  const handleVariableChange = (key: string, value: unknown) => {
    setVariables(prev => ({ ...prev, [key]: value }));
  };

  // Check if all required variables are filled
  const isValid = useMemo(() => {
    if (!selectedTemplate) return false;
    const required = selectedTemplate.variables?.filter(v => v.required) || [];
    return required.every(v => variables[v.key] !== undefined && variables[v.key] !== '');
  }, [selectedTemplate, variables]);

  // Handle apply
  const handleApply = () => {
    if (selectedTemplate && isValid) {
      onSelect(selectedTemplate, variables);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-claude-neutral-900 rounded-2xl shadow-2xl border border-claude-neutral-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-claude-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-claude-neutral-100">
              {step === 'browse' ? 'Choose a Template' : 'Configure Workflow'}
            </h2>
            <p className="text-sm text-claude-neutral-400 mt-0.5">
              {step === 'browse'
                ? 'Start with a pre-built automation pattern'
                : `Customize "${selectedTemplate?.name}"`}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-claude-neutral-400 hover:text-claude-neutral-200 hover:bg-claude-neutral-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'browse' ? (
          <>
            {/* Search and Filter */}
            <div className="px-6 py-4 border-b border-claude-neutral-800 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-claude-neutral-500" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-100 placeholder-claude-neutral-500 focus:outline-none focus:ring-2 focus:ring-claude-primary-500/50"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    selectedCategory === null
                      ? 'bg-claude-primary-500/20 text-claude-primary-400 border border-claude-primary-500/30'
                      : 'bg-claude-neutral-800 text-claude-neutral-400 hover:text-claude-neutral-200 border border-transparent'
                  )}
                >
                  All
                </button>
                {categories.map(cat => {
                  const Icon = categoryIcons[cat as keyof typeof categoryIcons] || Zap;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 capitalize',
                        selectedCategory === cat
                          ? 'bg-claude-primary-500/20 text-claude-primary-400 border border-claude-primary-500/30'
                          : 'bg-claude-neutral-800 text-claude-neutral-400 hover:text-claude-neutral-200 border border-transparent'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-claude-neutral-500">No templates found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map(template => {
                    const Icon = categoryIcons[template.category as keyof typeof categoryIcons] || Zap;
                    const colorClass = categoryColors[template.category as keyof typeof categoryColors] || 'text-claude-primary-400 bg-claude-primary-500/10';

                    return (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className="text-left p-4 bg-claude-neutral-800/50 hover:bg-claude-neutral-800 rounded-xl border border-claude-neutral-700 hover:border-claude-neutral-600 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colorClass)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-claude-neutral-100 truncate">
                                {template.name}
                              </h3>
                              <ChevronRight className="w-4 h-4 text-claude-neutral-600 group-hover:text-claude-neutral-400 transition-colors" />
                            </div>
                            <p className="text-sm text-claude-neutral-400 mt-1 line-clamp-2">
                              {template.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 bg-claude-neutral-700 rounded text-xs text-claude-neutral-300 capitalize">
                                {template.triggerType.toLowerCase()}
                              </span>
                              <span className="text-xs text-claude-neutral-500">
                                {template.actions.length} action{template.actions.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Configuration Step */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedTemplate && (
                <div className="space-y-6">
                  {/* Template Summary */}
                  <div className="p-4 bg-claude-neutral-800/50 rounded-xl border border-claude-neutral-700">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const Icon = categoryIcons[selectedTemplate.category as keyof typeof categoryIcons] || Zap;
                        const colorClass = categoryColors[selectedTemplate.category as keyof typeof categoryColors] || 'text-claude-primary-400 bg-claude-primary-500/10';
                        return (
                          <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colorClass)}>
                            <Icon className="w-5 h-5" />
                          </div>
                        );
                      })()}
                      <div>
                        <h3 className="font-medium text-claude-neutral-100">{selectedTemplate.name}</h3>
                        <p className="text-sm text-claude-neutral-400">{selectedTemplate.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Variables */}
                  {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-claude-neutral-200">Configuration</h4>
                      {selectedTemplate.variables.map(variable => (
                        <VariableInput
                          key={variable.key}
                          variable={variable}
                          value={variables[variable.key]}
                          onChange={value => handleVariableChange(variable.key, value)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Preview */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-claude-neutral-200">Preview</h4>
                    <div className="p-4 bg-claude-neutral-800/30 rounded-xl border border-claude-neutral-700 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-claude-neutral-500">Trigger:</span>
                        <span className="text-claude-neutral-200">{selectedTemplate.triggerType}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <span className="text-claude-neutral-500">Actions:</span>
                        <div className="space-y-1">
                          {selectedTemplate.actions.map((action, i) => (
                            <div key={i} className="text-claude-neutral-200">
                              {i + 1}. {action.type.replace('_', ' ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-claude-neutral-800 bg-claude-neutral-900/50">
              <button
                onClick={() => setStep('browse')}
                className="px-4 py-2 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 transition-colors"
              >
                Back to templates
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-sm text-claude-neutral-400 hover:text-claude-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApply}
                  disabled={!isValid || isLoading}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                    isValid && !isLoading
                      ? 'bg-claude-primary-500 hover:bg-claude-primary-400 text-white'
                      : 'bg-claude-neutral-700 text-claude-neutral-500 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Create Workflow
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface VariableInputProps {
  variable: TemplateVariable;
  value: unknown;
  onChange: (value: unknown) => void;
}

function VariableInput({ variable, value, onChange }: VariableInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm text-claude-neutral-200">
        {variable.label}
        {variable.required && <span className="text-red-400">*</span>}
        {variable.description && (
          <div className="relative group">
            <Info className="w-3.5 h-3.5 text-claude-neutral-500 cursor-help" />
            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-10">
              <div className="bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg px-3 py-2 text-xs text-claude-neutral-300 max-w-xs whitespace-normal shadow-lg">
                {variable.description}
              </div>
            </div>
          </div>
        )}
      </label>

      {variable.type === 'select' && variable.options ? (
        <select
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-100 focus:outline-none focus:ring-2 focus:ring-claude-primary-500/50"
        >
          <option value="">Select...</option>
          {variable.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : variable.type === 'number' ? (
        <input
          type="number"
          value={value !== undefined ? String(value) : ''}
          onChange={e => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-100 focus:outline-none focus:ring-2 focus:ring-claude-primary-500/50"
        />
      ) : variable.type === 'boolean' ? (
        <button
          onClick={() => onChange(!value)}
          className={clsx(
            'w-12 h-6 rounded-full transition-colors relative',
            value ? 'bg-claude-primary-500' : 'bg-claude-neutral-700'
          )}
        >
          <div
            className={clsx(
              'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
              value ? 'translate-x-7' : 'translate-x-1'
            )}
          />
        </button>
      ) : (
        <input
          type="text"
          value={String(value || '')}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-claude-neutral-800 border border-claude-neutral-700 rounded-lg text-sm text-claude-neutral-100 focus:outline-none focus:ring-2 focus:ring-claude-primary-500/50"
        />
      )}
    </div>
  );
}

export default WorkflowTemplateSelector;
